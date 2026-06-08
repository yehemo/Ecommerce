<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_prepare_payway_qr_for_their_pending_unpaid_order_within_ten_minutes(): void
    {
        config()->set('services.payway.base_url', 'https://checkout-sandbox.payway.com.kh');
        config()->set('services.payway.merchant_id', 'ec475938');
        config()->set('services.payway.public_key', 'test-public-key');
        config()->set('services.payway.callback_url', 'https://merchant.test/api/payments/payway/callback');

        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr' => Http::response([
                'qrString' => 'KHQR-STRING',
                'qrImage' => 'data:image/png;base64,AAA',
                'abapay_deeplink' => 'abamobilebank://ababank.com?type=payway&qrcode=KHQR-STRING',
                'status' => [
                    'code' => '0',
                    'message' => 'Success.',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $order = $this->createOrderWithPayment($user, now()->subMinutes(5));

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.payments.0.status', 'pending')
            ->assertJsonPath('data.payments.0.qr_string', 'KHQR-STRING');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'pending',
        ]);
    }

    public function test_user_cannot_prepare_payment_for_another_users_order(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $order = $this->createOrderWithPayment($owner, now()->subMinutes(5));

        $this->actingAs($otherUser)
            ->postJson("/api/orders/{$order->id}/pay")
            ->assertForbidden();
    }

    public function test_user_cannot_request_payment_after_ten_minutes_and_order_is_expired(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithPayment($user, now()->subMinutes(10));

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/pay")
            ->assertStatus(422)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_status', 'cancelled')
            ->assertJsonPath('data.payments.0.status', 'cancelled');
    }

    public function test_user_cannot_request_payment_for_an_already_cancelled_or_paid_order(): void
    {
        $user = User::factory()->create();

        $cancelledOrder = $this->createOrderWithPayment($user, now()->subMinutes(2), [
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ], [
            'status' => 'cancelled',
        ]);

        $paidOrder = $this->createOrderWithPayment($user, now()->subMinutes(2), [
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson("/api/orders/{$cancelledOrder->id}/pay")
            ->assertStatus(422);

        $this->actingAs($user)
            ->postJson("/api/orders/{$paidOrder->id}/pay")
            ->assertStatus(422);
    }

    public function test_user_can_cancel_their_unpaid_order_within_ten_minutes(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 2,
        ]);
        $order = $this->createOrderWithPayment($user, now()->subMinutes(4), items: [
            [
                'product_variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'sku' => $variant->sku,
                'quantity' => 2,
                'unit_price_minor' => $variant->price_minor,
            ],
        ]);

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_status', 'cancelled')
            ->assertJsonPath('data.payments.0.status', 'cancelled');

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 4,
        ]);
    }

    public function test_user_cannot_cancel_another_users_order(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $order = $this->createOrderWithPayment($owner, now()->subMinutes(4));

        $this->actingAs($otherUser)
            ->postJson("/api/orders/{$order->id}/cancel")
            ->assertForbidden();
    }

    public function test_user_cannot_cancel_after_ten_minutes(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithPayment($user, now()->subMinutes(11));

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/cancel")
            ->assertStatus(422)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payments.0.status', 'cancelled');
    }

    public function test_user_cannot_cancel_an_already_paid_order(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithPayment($user, now()->subMinutes(2), [
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/cancel")
            ->assertStatus(422);
    }

    public function test_expiry_command_cancels_overdue_unpaid_orders(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 1,
        ]);
        $order = $this->createOrderWithPayment($user, now()->subMinutes(11), items: [
            [
                'product_variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'sku' => $variant->sku,
                'quantity' => 3,
                'unit_price_minor' => $variant->price_minor,
            ],
        ]);

        $this->artisan('orders:expire-unpaid')
            ->expectsOutput('Cancelled 1 overdue unpaid order(s).')
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 4,
        ]);
    }

    public function test_expiry_command_does_not_cancel_already_paid_orders(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 1,
        ]);
        $order = $this->createOrderWithPayment($user, now()->subMinutes(11), [
            'status' => 'processing',
            'payment_status' => 'paid',
        ], [
            'status' => 'paid',
            'paid_at' => now()->subMinutes(9),
        ], [
            [
                'product_variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'sku' => $variant->sku,
                'quantity' => 3,
                'unit_price_minor' => $variant->price_minor,
            ],
        ]);

        $this->artisan('orders:expire-unpaid')
            ->expectsOutput('Cancelled 0 overdue unpaid order(s).')
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 1,
        ]);
    }

    public function test_generating_payment_qr_does_not_restore_reserved_stock(): void
    {
        config()->set('services.payway.base_url', 'https://checkout-sandbox.payway.com.kh');
        config()->set('services.payway.merchant_id', 'ec475938');
        config()->set('services.payway.public_key', 'test-public-key');
        config()->set('services.payway.callback_url', 'https://merchant.test/api/payments/payway/callback');

        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr' => Http::response([
                'qrString' => 'KHQR-STRING',
                'qrImage' => 'data:image/png;base64,AAA',
                'abapay_deeplink' => 'abamobilebank://ababank.com?type=payway&qrcode=KHQR-STRING',
                'status' => [
                    'code' => '0',
                    'message' => 'Success.',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create([
            'stock_qty' => 2,
        ]);
        $order = $this->createOrderWithPayment($user, now()->subMinutes(2), items: [
            [
                'product_variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'sku' => $variant->sku,
                'quantity' => 2,
                'unit_price_minor' => $variant->price_minor,
            ],
        ]);

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/pay")
            ->assertOk();

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_qty' => 2,
        ]);
    }

    public function test_show_endpoint_syncs_expired_order_state(): void
    {
        $user = User::factory()->create();
        $order = $this->createOrderWithPayment($user, now()->subMinutes(10));

        $this->actingAs($user)
            ->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_status', 'cancelled')
            ->assertJsonPath('data.payments.0.status', 'cancelled');
    }

    /**
     * @param  array<string, mixed>  $orderOverrides
     * @param  array<string, mixed>  $paymentOverrides
     * @param  array<int, array<string, mixed>>  $items
     */
    private function createOrderWithPayment(
        User $user,
        \Illuminate\Support\Carbon $placedAt,
        array $orderOverrides = [],
        array $paymentOverrides = [],
        array $items = [],
    ): Order {
        $order = Order::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => $placedAt,
        ], $orderOverrides));

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? Product::factory()->create()->id;
            $quantity = $item['quantity'] ?? 1;
            $unitPriceMinor = $item['unit_price_minor'] ?? 1000;

            $order->items()->create([
                'product_id' => $productId,
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'product_name' => $item['product_name'] ?? 'Test Product',
                'sku' => $item['sku'] ?? 'TEST-SKU',
                'unit_price_minor' => $unitPriceMinor,
                'quantity' => $quantity,
                'line_total_minor' => $item['line_total_minor'] ?? ($quantity * $unitPriceMinor),
            ]);
        }

        Payment::factory()->create(array_merge([
            'order_id' => $order->id,
            'provider' => 'payway',
            'provider_reference' => null,
            'amount_minor' => $order->total_minor,
            'currency' => $order->currency,
            'status' => 'pending',
            'paid_at' => null,
        ], $paymentOverrides));

        return $order;
    }
}
