<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_their_active_cart(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/cart');

        $response->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.status', 'active');
    }

    public function test_authenticated_user_can_add_an_item_to_cart(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'price_minor' => 2599,
            'stock_qty' => 10,
        ]);

        $response = $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.quantity', 2)
            ->assertJsonPath('data.unit_price_minor', 2599);

        $this->assertDatabaseHas('cart_items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
            'unit_price_minor' => 2599,
        ]);
    }

    public function test_adding_same_variant_twice_increments_existing_cart_item_quantity(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'price_minor' => 4200,
            'stock_qty' => 10,
        ]);

        $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 1,
        ])->assertCreated();

        $response = $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.quantity', 3);

        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_user_cannot_update_another_users_cart_item(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 10,
        ]);
        $cart = Cart::factory()->create([
            'user_id' => $owner->id,
            'status' => 'active',
        ]);
        $cartItem = CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $variant->id,
        ]);

        $this->actingAs($otherUser)
            ->patchJson("/api/cart/items/{$cartItem->id}", [
                'quantity' => 4,
            ])
            ->assertForbidden();
    }

    public function test_user_can_remove_their_cart_item(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create();
        $cart = Cart::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);
        $cartItem = CartItem::factory()->create([
            'cart_id' => $cart->id,
            'product_variant_id' => $variant->id,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/cart/items/{$cartItem->id}")
            ->assertOk();

        $this->assertDatabaseMissing('cart_items', [
            'id' => $cartItem->id,
        ]);
    }
}
