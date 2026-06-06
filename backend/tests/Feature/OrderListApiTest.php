<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderListApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_only_their_orders(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $latestOrder = $this->createOrderForUser($user, [
            'placed_at' => now()->subMinutes(1),
        ]);
        $olderOrder = $this->createOrderForUser($user, [
            'placed_at' => now()->subMinutes(8),
        ]);
        $this->createOrderForUser($otherUser, [
            'placed_at' => now()->subMinutes(2),
        ]);

        $this->actingAs($user)
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $latestOrder->id)
            ->assertJsonPath('data.1.id', $olderOrder->id);
    }

    public function test_order_tabs_filter_orders_by_customer_facing_state(): void
    {
        $user = User::factory()->create();

        $pendingPayment = $this->createOrderForUser($user, [
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(3),
        ], [
            'status' => 'pending',
        ]);

        $pendingShipping = $this->createOrderForUser($user, [
            'status' => 'processing',
            'payment_status' => 'paid',
            'placed_at' => now()->subMinutes(15),
        ], [
            'status' => 'paid',
            'paid_at' => now()->subMinutes(14),
        ]);

        $cancelled = $this->createOrderForUser($user, [
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
            'placed_at' => now()->subMinutes(20),
        ], [
            'status' => 'cancelled',
        ]);

        $this->actingAs($user)
            ->getJson('/api/orders?tab=pending_payment')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pendingPayment->id);

        $this->actingAs($user)
            ->getJson('/api/orders?tab=pending_shipping')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pendingShipping->id);

        $this->actingAs($user)
            ->getJson('/api/orders?tab=cancelled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $cancelled->id);
    }

    public function test_order_list_syncs_expired_pending_orders_before_returning_them(): void
    {
        $user = User::factory()->create();
        $expired = $this->createOrderForUser($user, [
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(11),
        ], [
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('data.0.id', $expired->id)
            ->assertJsonPath('data.0.status', 'cancelled')
            ->assertJsonPath('data.0.payment_status', 'cancelled')
            ->assertJsonPath('data.0.payments.0.status', 'cancelled');
    }

    /**
     * @param  array<string, mixed>  $orderAttributes
     * @param  array<string, mixed>  $paymentAttributes
     */
    private function createOrderForUser(User $user, array $orderAttributes = [], array $paymentAttributes = []): Order
    {
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(2),
            ...$orderAttributes,
        ]);

        Payment::factory()->create([
            'order_id' => $order->id,
            'status' => 'pending',
            ...$paymentAttributes,
        ]);

        return $order;
    }
}
