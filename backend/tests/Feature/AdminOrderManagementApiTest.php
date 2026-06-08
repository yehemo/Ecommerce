<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrderManagementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_all_orders_across_users(): void
    {
        $admin = User::factory()->admin()->create();
        $customerA = User::factory()->create(['name' => 'Alice Example']);
        $customerB = User::factory()->create(['name' => 'Bob Example']);

        $orderA = $this->createOrderWithDetails($customerA, ['order_number' => 'ORD-ADMIN001']);
        $orderB = $this->createOrderWithDetails($customerB, ['order_number' => 'ORD-ADMIN002']);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonFragment(['order_number' => 'ORD-ADMIN001'])
            ->assertJsonFragment(['order_number' => 'ORD-ADMIN002']);
    }

    public function test_non_admin_cannot_access_admin_order_endpoints(): void
    {
        $customer = User::factory()->create();
        $order = $this->createOrderWithDetails($customer);

        $this->actingAs($customer)
            ->getJson('/api/admin/orders')
            ->assertForbidden();

        $this->actingAs($customer)
            ->patchJson("/api/admin/orders/{$order->id}/status", [
                'status' => 'shipped',
            ])
            ->assertForbidden();

        $this->actingAs($customer)
            ->patchJson("/api/admin/orders/{$order->id}/shipment", [
                'carrier' => 'DHL',
                'tracking_number' => 'TRK-30001',
                'tracking_url' => 'https://tracking.example.com/TRK-30001',
                'notes' => 'Should be forbidden.',
                'status' => 'shipped',
            ])
            ->assertForbidden();
    }

    public function test_admin_tabs_and_search_filter_orders_correctly(): void
    {
        $admin = User::factory()->admin()->create();
        $pendingCustomer = User::factory()->create(['name' => 'Pending User']);
        $shippingCustomer = User::factory()->create(['name' => 'Shipping User']);
        $shippedCustomer = User::factory()->create(['email' => 'shipped@example.com']);
        $deliveredCustomer = User::factory()->create(['name' => 'Delivered User']);
        $cancelledCustomer = User::factory()->create(['name' => 'Cancelled User']);

        $pendingOrder = $this->createOrderWithDetails($pendingCustomer, [
            'order_number' => 'ORD-PENDING01',
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ], [
            'status' => 'pending',
        ]);

        $processingOrder = $this->createOrderWithDetails($shippingCustomer, [
            'order_number' => 'ORD-PROCESS01',
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $shippedOrder = $this->createOrderWithDetails($shippedCustomer, [
            'order_number' => 'ORD-SHIPPED01',
            'status' => 'shipped',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $deliveredOrder = $this->createOrderWithDetails($deliveredCustomer, [
            'order_number' => 'ORD-DELIVER01',
            'status' => 'delivered',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $cancelledOrder = $this->createOrderWithDetails($cancelledCustomer, [
            'order_number' => 'ORD-CANCEL01',
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ], [
            'status' => 'cancelled',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?tab=pending_payment')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pendingOrder->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?tab=pending_shipping')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $processingOrder->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?tab=shipped')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $shippedOrder->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?tab=delivered')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $deliveredOrder->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?tab=cancelled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $cancelledOrder->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders?search=shipped@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $shippedOrder->id);
    }

    public function test_admin_list_syncs_expired_pending_orders_before_returning_them(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $order = $this->createOrderWithDetails($customer, [
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(11),
        ], [
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.status', 'cancelled')
            ->assertJsonPath('data.0.payment_status', 'cancelled');
    }

    public function test_admin_can_transition_processing_order_to_shipped_then_delivered(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $order = $this->createOrderWithDetails($customer, [
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/shipment", [
                'carrier' => 'DHL',
                'tracking_number' => 'TRK-10001',
                'tracking_url' => 'https://tracking.example.com/TRK-10001',
                'notes' => 'Packed and scanned.',
                'status' => 'shipped',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'shipped')
            ->assertJsonPath('data.shipment.carrier', 'DHL')
            ->assertJsonPath('data.shipment.status', 'shipped');

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/shipment", [
                'carrier' => 'DHL',
                'tracking_number' => 'TRK-10001',
                'tracking_url' => 'https://tracking.example.com/TRK-10001',
                'notes' => 'Delivered to the front desk.',
                'status' => 'delivered',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.shipment.status', 'delivered');
    }

    public function test_invalid_admin_order_status_transition_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $order = $this->createOrderWithDetails($customer, [
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ], [
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/shipment", [
                'carrier' => 'DHL',
                'tracking_number' => 'TRK-10099',
                'tracking_url' => 'https://tracking.example.com/TRK-10099',
                'notes' => 'Invalid direct delivery.',
                'status' => 'delivered',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only shipped paid orders can be marked as delivered.');
    }

    public function test_admin_can_cancel_actionable_pending_order_and_restore_stock(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $variant = ProductVariant::factory()->create(['stock_qty' => 3]);

        $order = $this->createOrderWithDetails($customer, [
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(4),
        ], [
            'status' => 'pending',
        ], [
            [
                'product_variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'sku' => $variant->sku,
                'quantity' => 2,
                'unit_price_minor' => $variant->price_minor,
            ],
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_status', 'cancelled');

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 5,
        ]);
    }

    public function test_admin_can_edit_order_snapshot_addresses_without_touching_saved_addresses(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $savedAddress = Address::factory()->create([
            'user_id' => $customer->id,
            'full_name' => 'Saved Profile Address',
            'postal_code' => '90210',
        ]);
        $order = $this->createOrderWithDetails($customer);

        $this->actingAs($admin)
            ->patchJson("/api/admin/orders/{$order->id}/addresses", $this->addressPayload())
            ->assertOk()
            ->assertJsonPath('data.addresses.0.full_name', 'Warehouse Override');

        $this->assertDatabaseHas('order_addresses', [
            'order_id' => $order->id,
            'type' => 'shipping',
            'full_name' => 'Warehouse Override',
        ]);

        $this->assertDatabaseHas('addresses', [
            'id' => $savedAddress->id,
            'full_name' => 'Saved Profile Address',
            'postal_code' => '90210',
        ]);
    }

    public function test_customer_order_show_includes_shipment_details(): void
    {
        $customer = User::factory()->create();
        $order = $this->createOrderWithDetails($customer, [
            'status' => 'shipped',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $order->shipment()->create([
            'carrier' => 'FedEx',
            'tracking_number' => 'TRK-20001',
            'tracking_url' => 'https://tracking.example.com/TRK-20001',
            'status' => 'shipped',
            'shipped_at' => now()->subHour(),
            'delivered_at' => null,
            'notes' => 'Left the origin facility.',
        ]);

        $this->actingAs($customer)
            ->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.shipment.carrier', 'FedEx')
            ->assertJsonPath('data.shipment.tracking_number', 'TRK-20001');
    }

    /**
     * @param  array<string, mixed>  $orderOverrides
     * @param  array<string, mixed>  $paymentOverrides
     * @param  array<int, array<string, mixed>>  $items
     */
    private function createOrderWithDetails(
        User $user,
        array $orderOverrides = [],
        array $paymentOverrides = [],
        array $items = [],
    ): Order
    {
        $order = Order::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(2),
        ], $orderOverrides));

        $order->addresses()->createMany([
            [
                'type' => 'shipping',
                'full_name' => 'Initial Shipping',
                'phone' => '5551112222',
                'line_1' => '123 Market Street',
                'line_2' => null,
                'city' => 'Austin',
                'postal_code' => '78701',
            ],
            [
                'type' => 'billing',
                'full_name' => 'Initial Billing',
                'phone' => '5553334444',
                'line_1' => '789 Billing Street',
                'line_2' => null,
                'city' => 'Dallas',
                'postal_code' => '75001',
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

        foreach ($items as $item) {
            $order->items()->create([
                'product_id' => $item['product_id'] ?? null,
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'product_name' => $item['product_name'] ?? 'Order Product',
                'sku' => $item['sku'] ?? 'SKU-ORDER001',
                'unit_price_minor' => $item['unit_price_minor'] ?? 1200,
                'quantity' => $item['quantity'] ?? 1,
                'line_total_minor' => ($item['unit_price_minor'] ?? 1200) * ($item['quantity'] ?? 1),
            ]);
        }

        return $order;
    }

    /**
     * @return array<string, array<string, string|null>>
     */
    private function addressPayload(): array
    {
        return [
            'shipping_address' => [
                'full_name' => 'Warehouse Override',
                'phone' => '5559998888',
                'line_1' => '456 Fulfillment Ave',
                'line_2' => 'Dock 3',
                'city' => 'Seattle',
                'postal_code' => '98101',
            ],
            'billing_address' => [
                'full_name' => 'Finance Override',
                'phone' => '5551110000',
                'line_1' => '789 Accounts Road',
                'line_2' => null,
                'city' => 'Portland',
                'postal_code' => '97204',
            ],
        ];
    }
}
