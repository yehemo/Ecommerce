<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAddressEditApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_their_order_addresses_within_ten_minutes(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithAddresses($user, now()->subMinutes(5));

        $this->actingAs($user)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertOk()
            ->assertJsonPath('data.addresses.0.full_name', 'Updated Name');

        $this->assertDatabaseHas('order_addresses', [
            'order_id' => $order->id,
            'type' => 'shipping',
            'full_name' => 'Updated Name',
            'postal_code' => '10001',
        ]);
    }

    public function test_user_cannot_update_another_users_order_addresses(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $order = $this->createOrderWithAddresses($owner, now()->subMinutes(5));

        $this->actingAs($otherUser)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertForbidden();
    }

    public function test_user_cannot_update_order_addresses_after_ten_minutes(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithAddresses($user, now()->subMinutes(11));

        $this->actingAs($user)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Order addresses can only be updated within 10 minutes of checkout.');
    }

    public function test_user_cannot_update_order_addresses_after_payment(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithAddresses($user, now()->subMinutes(3), [
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($user)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Order addresses can only be updated within 10 minutes of checkout.');
    }

    public function test_user_cannot_update_order_addresses_after_cancellation(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithAddresses($user, now()->subMinutes(3), [
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ], [
            'status' => 'cancelled',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Order addresses can only be updated within 10 minutes of checkout.');
    }

    public function test_updating_order_addresses_does_not_mutate_saved_addresses(): void
    {
        $user = User::factory()->create();
        $savedAddress = Address::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'Saved Address',
            'postal_code' => '78701',
        ]);
        $order = $this->createOrderWithAddresses($user, now()->subMinutes(2));

        $this->actingAs($user)
            ->patchJson("/api/orders/{$order->id}/addresses", $this->updatePayload())
            ->assertOk();

        $this->assertDatabaseHas('addresses', [
            'id' => $savedAddress->id,
            'full_name' => 'Saved Address',
            'postal_code' => '78701',
        ]);
    }

    /**
     * @param  array<string, mixed>  $orderOverrides
     * @param  array<string, mixed>  $paymentOverrides
     */
    private function createOrderWithAddresses(
        User $user,
        \Illuminate\Support\Carbon $placedAt,
        array $orderOverrides = [],
        array $paymentOverrides = [],
    ): Order
    {
        $order = Order::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => $placedAt,
        ], $orderOverrides));

        $order->addresses()->createMany([
            [
                'type' => 'shipping',
                'full_name' => 'Jane Shopper',
                'phone' => '5551234567',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
            [
                'type' => 'billing',
                'full_name' => 'Jane Shopper',
                'phone' => '5551234567',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
        ]);

        $order->payments()->create(array_merge([
            'provider' => 'manual',
            'provider_reference' => null,
            'amount_minor' => $order->total_minor,
            'currency' => $order->currency,
            'status' => 'pending',
            'paid_at' => null,
        ], $paymentOverrides));

        return $order;
    }

    /**
     * @return array<string, array<string, string|null>>
     */
    private function updatePayload(): array
    {
        return [
            'shipping_address' => [
                'full_name' => 'Updated Name',
                'phone' => '5557779999',
                'line_1' => '456 New Street',
                'line_2' => 'Apt 3',
                'city' => 'New York',
                'postal_code' => '10001',
            ],
            'billing_address' => [
                'full_name' => 'Billing Name',
                'phone' => '5558880000',
                'line_1' => '789 Billing Street',
                'line_2' => null,
                'city' => 'Brooklyn',
                'postal_code' => '11201',
            ],
        ];
    }
}
