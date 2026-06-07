<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_an_order_from_a_valid_active_cart(): void
    {
        $user = User::factory()->create();
        [$cart, $variant] = $this->createCartWithSingleItem($user, [
            'price_minor' => 2599,
            'stock_qty' => 5,
        ], quantity: 2);

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.subtotal_minor', 5198)
            ->assertJsonPath('data.tax_minor', 416)
            ->assertJsonPath('data.total_minor', 5614)
            ->assertJsonPath('data.items.0.product_variant_id', $variant->id);

        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'subtotal_minor' => 5198,
            'tax_minor' => 416,
            'total_minor' => 5614,
        ]);

        $this->assertDatabaseHas('carts', [
            'id' => $cart->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 3,
        ]);
    }

    public function test_empty_cart_checkout_returns_validation_error_response(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cart']);
    }

    public function test_checkout_snapshots_item_name_sku_price_and_quantity_correctly(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'name' => 'Field Jacket',
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'sku' => 'JACKET-GRN-M',
            'price_minor' => 6400,
            'stock_qty' => 10,
        ]);
        $cart = Cart::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $variant->id,
            'quantity' => 3,
            'unit_price_minor' => 6400,
        ]);

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertCreated()
            ->assertJsonPath('data.items.0.product_name', 'Field Jacket')
            ->assertJsonPath('data.items.0.sku', 'JACKET-GRN-M')
            ->assertJsonPath('data.items.0.unit_price_minor', 6400)
            ->assertJsonPath('data.items.0.quantity', 3)
            ->assertJsonPath('data.items.0.line_total_minor', 19200);
    }

    public function test_checkout_creates_both_shipping_and_billing_addresses(): void
    {
        $user = User::factory()->create();
        $this->createCartWithSingleItem($user);

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertCreated()
            ->assertJsonCount(2, 'data.addresses');

        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('order_addresses', [
            'order_id' => $orderId,
            'type' => 'shipping',
            'full_name' => 'Jane Shopper',
        ]);

        $this->assertDatabaseHas('order_addresses', [
            'order_id' => $orderId,
            'type' => 'billing',
            'full_name' => 'Jane Shopper',
        ]);
    }

    public function test_checkout_creates_placeholder_payment(): void
    {
        $user = User::factory()->create();
        $this->createCartWithSingleItem($user, [
            'price_minor' => 4900,
            'stock_qty' => 5,
        ], quantity: 2);

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertCreated()
            ->assertJsonPath('data.payments.0.provider', 'payway')
            ->assertJsonPath('data.payments.0.currency', 'USD')
            ->assertJsonPath('data.payments.0.status', 'pending')
            ->assertJsonPath('data.payments.0.amount_minor', 10584);
    }

    public function test_next_cart_fetch_creates_a_new_active_cart_after_checkout(): void
    {
        $user = User::factory()->create();
        $originalCart = $this->createCartWithSingleItem($user)[0];

        $this->actingAs($user)
            ->postJson('/api/checkout', $this->checkoutPayload())
            ->assertCreated();

        $response = $this->actingAs($user)->getJson('/api/cart');

        $response->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.status', 'active');

        $this->assertNotSame($originalCart->id, $response->json('data.id'));
        $this->assertDatabaseHas('carts', [
            'id' => $originalCart->id,
            'status' => 'completed',
        ]);
    }

    public function test_checkout_rejects_insufficient_stock(): void
    {
        $user = User::factory()->create();
        [, $variant] = $this->createCartWithSingleItem($user, [
            'price_minor' => 3200,
            'stock_qty' => 1,
        ], quantity: 2);

        $response = $this->actingAs($user)->postJson('/api/checkout', $this->checkoutPayload());

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cart']);

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 1,
        ]);
    }

    public function test_checkout_reduces_stock_for_multiple_variants(): void
    {
        $user = User::factory()->create();
        $firstVariant = ProductVariant::factory()->create([
            'price_minor' => 1500,
            'stock_qty' => 5,
        ]);
        $secondVariant = ProductVariant::factory()->create([
            'price_minor' => 2300,
            'stock_qty' => 8,
        ]);
        $cart = Cart::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $firstVariant->id,
            'quantity' => 2,
            'unit_price_minor' => $firstVariant->price_minor,
        ]);

        CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $secondVariant->id,
            'quantity' => 3,
            'unit_price_minor' => $secondVariant->price_minor,
        ]);

        $this->actingAs($user)
            ->postJson('/api/checkout', $this->checkoutPayload())
            ->assertCreated();

        $this->assertDatabaseHas('product_variants', [
            'id' => $firstVariant->id,
            'stock_qty' => 3,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'id' => $secondVariant->id,
            'stock_qty' => 5,
        ]);
    }

    /**
     * @param  array<string, mixed>  $variantOverrides
     * @return array{0: Cart, 1: ProductVariant}
     */
    private function createCartWithSingleItem(User $user, array $variantOverrides = [], int $quantity = 1): array
    {
        $variant = ProductVariant::factory()->create($variantOverrides);
        $cart = Cart::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $variant->id,
            'quantity' => $quantity,
            'unit_price_minor' => $variant->price_minor,
        ]);

        return [$cart, $variant];
    }

    /**
     * @return array<string, array<string, string|null>>
     */
    private function checkoutPayload(): array
    {
        return [
            'shipping_address' => [
                'full_name' => 'Jane Shopper',
                'phone' => '5551234567',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
            'billing_address' => [
                'full_name' => 'Jane Shopper',
                'phone' => '5551234567',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
        ];
    }
}
