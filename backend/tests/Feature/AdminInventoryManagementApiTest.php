<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductOptionType;
use App\Models\ProductOptionValue;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInventoryManagementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_inventory_endpoints(): void
    {
        $customer = User::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->actingAs($customer)
            ->getJson('/api/admin/inventory')
            ->assertForbidden();

        $this->actingAs($customer)
            ->postJson("/api/admin/inventory/{$variant->id}/adjust", [
                'action' => 'increment',
                'quantity' => 3,
                'reason' => 'restock',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_list_inventory_and_filter_low_stock_and_out_of_stock(): void
    {
        $admin = User::factory()->admin()->create();

        $product = Product::factory()->create(['name' => 'Utility Jacket']);
        $lowVariant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'sku' => 'UTIL-SAND-M',
            'stock_qty' => 4,
        ]);
        $outVariant = ProductVariant::factory()->create([
            'sku' => 'UTIL-BLACK-L',
            'stock_qty' => 0,
        ]);
        ProductVariant::factory()->create([
            'sku' => 'UTIL-NAVY-XL',
            'stock_qty' => 12,
        ]);

        $optionType = ProductOptionType::factory()->create([
            'product_id' => $product->id,
            'name' => 'Color',
        ]);
        $optionValue = ProductOptionValue::factory()->create([
            'option_type_id' => $optionType->id,
            'value' => 'Sand',
        ]);
        $lowVariant->optionValues()->attach($optionValue->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/inventory?tab=low_stock&search=Utility')
            ->assertOk()
            ->assertJsonPath('meta.low_stock_threshold', 5)
            ->assertJsonPath('meta.low_stock_count', 1)
            ->assertJsonPath('meta.out_of_stock_count', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $lowVariant->id)
            ->assertJsonPath('data.0.stock_state', 'low_stock')
            ->assertJsonPath('data.0.option_values.0.value', 'Sand');

        $this->actingAs($admin)
            ->getJson('/api/admin/inventory?tab=out_of_stock')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $outVariant->id)
            ->assertJsonPath('data.0.stock_state', 'out_of_stock');
    }

    public function test_admin_can_adjust_inventory_with_set_increment_and_decrement_actions(): void
    {
        $admin = User::factory()->admin()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 8,
            'sku' => 'INV-ADJ-001',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/inventory/{$variant->id}/adjust", [
                'action' => 'set',
                'quantity' => 5,
                'reason' => 'correction',
            ])
            ->assertOk()
            ->assertJsonPath('data.stock_qty', 5)
            ->assertJsonPath('data.inventory_movements.0.reason', 'correction')
            ->assertJsonPath('data.inventory_movements.0.quantity_before', 8)
            ->assertJsonPath('data.inventory_movements.0.quantity_after', 5)
            ->assertJsonPath('data.inventory_movements.0.quantity_delta', -3)
            ->assertJsonPath('data.inventory_movements.0.actor.id', $admin->id);

        $this->actingAs($admin)
            ->postJson("/api/admin/inventory/{$variant->id}/adjust", [
                'action' => 'increment',
                'quantity' => 4,
                'reason' => 'restock',
            ])
            ->assertOk()
            ->assertJsonPath('data.stock_qty', 9);

        $this->actingAs($admin)
            ->postJson("/api/admin/inventory/{$variant->id}/adjust", [
                'action' => 'decrement',
                'quantity' => 2,
                'reason' => 'damage',
            ])
            ->assertOk()
            ->assertJsonPath('data.stock_qty', 7);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 7,
        ]);

        $this->assertDatabaseCount('inventory_movements', 3);
    }

    public function test_admin_adjustment_cannot_reduce_stock_below_zero(): void
    {
        $admin = User::factory()->admin()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 2,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/inventory/{$variant->id}/adjust", [
                'action' => 'decrement',
                'quantity' => 5,
                'reason' => 'damage',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }

    public function test_checkout_creates_checkout_reservation_inventory_movement(): void
    {
        $user = User::factory()->create();
        [$cart, $variant] = $this->createCartWithSingleItem($user, [
            'price_minor' => 2400,
            'stock_qty' => 6,
        ], quantity: 2);

        $response = $this->actingAs($user)
            ->postJson('/api/checkout', $this->checkoutPayload())
            ->assertCreated();

        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id,
            'order_id' => $orderId,
            'reason' => 'checkout_reservation',
            'quantity_delta' => -2,
            'quantity_before' => 6,
            'quantity_after' => 4,
        ]);

        $this->assertDatabaseHas('carts', [
            'id' => $cart->id,
            'status' => 'completed',
        ]);
    }

    public function test_admin_cancelling_actionable_pending_order_creates_restore_inventory_movement(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        [, $variant] = $this->createCartWithSingleItem($customer, [
            'price_minor' => 4200,
            'stock_qty' => 5,
        ], quantity: 2);

        $checkoutResponse = $this->actingAs($customer)
            ->postJson('/api/checkout', $this->checkoutPayload())
            ->assertCreated();

        /** @var Order $order */
        $order = Order::query()->findOrFail($checkoutResponse->json('data.id'));

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 5,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'product_variant_id' => $variant->id,
            'order_id' => $order->id,
            'reason' => 'cancellation_restore',
            'quantity_delta' => 2,
            'quantity_before' => 3,
            'quantity_after' => 5,
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
                'phone' => '5551112222',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
            'billing_address' => [
                'full_name' => 'Jane Shopper',
                'phone' => '5551112222',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
        ];
    }
}
