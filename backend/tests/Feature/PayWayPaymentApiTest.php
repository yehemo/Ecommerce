<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PayWayPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.payway.base_url', 'https://checkout-sandbox.payway.com.kh');
        config()->set('services.payway.merchant_id', 'ec475938');
        config()->set('services.payway.public_key', 'test-public-key');
    }

    public function test_user_can_generate_payway_qr_for_a_pending_order(): void
    {
        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr' => Http::response([
                'qrString' => 'KHQR-STRING',
                'qrImage' => 'data:image/png;base64,AAA',
                'abapay_deeplink' => 'abamobilebank://ababank.com?type=payway&qrcode=KHQR-STRING',
                'amount' => 12.34,
                'currency' => 'USD',
                'status' => [
                    'code' => '0',
                    'message' => 'Success.',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $order = $this->createPendingOrder($user);

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.payments.0.provider', 'payway')
            ->assertJsonPath('data.payments.0.status', 'pending')
            ->assertJsonPath('data.payments.0.qr_string', 'KHQR-STRING');

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'provider' => 'payway',
            'status' => 'pending',
        ]);

        Http::assertSent(function ($request) {
            if ($request->url() !== 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr') {
                return false;
            }

            $data = $request->data();

            return isset($data['req_time'], $data['merchant_id'], $data['tran_id'], $data['amount'], $data['payment_option'], $data['currency'], $data['qr_image_template'], $data['hash'])
                && !isset(
                    $data['first_name'],
                    $data['last_name'],
                    $data['email'],
                    $data['phone'],
                    $data['purchase_type'],
                    $data['items'],
                    $data['callback_url'],
                    $data['return_deeplink'],
                    $data['custom_fields'],
                    $data['return_params'],
                    $data['payout'],
                    $data['lifetime'],
                );
        });
    }

    public function test_show_endpoint_reconciles_an_approved_payway_transaction(): void
    {
        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2' => Http::response([
                'data' => [
                    'payment_status' => 'APPROVED',
                    'apv' => '753786',
                    'transaction_date' => '2026-06-08 13:55:25',
                ],
                'status' => [
                    'code' => '00',
                    'message' => 'Success!',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $order = $this->createPendingOrder($user, [
            'provider_reference' => 'PW260608135525ABCD12',
            'qr_string' => 'KHQR-STRING',
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->actingAs($user)
            ->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payments.0.status', 'paid')
            ->assertJsonPath('data.payments.0.provider_status', 'APPROVED')
            ->assertJsonPath('data.payments.0.provider_approval_code', '753786');
    }

    public function test_orders_index_reconciles_an_approved_payway_transaction(): void
    {
        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2' => Http::response([
                'data' => [
                    'payment_status' => 'APPROVED',
                    'apv' => '112233',
                    'transaction_date' => '2026-06-08 14:12:00',
                ],
                'status' => [
                    'code' => '00',
                    'message' => 'Success!',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $order = $this->createPendingOrder($user, [
            'provider_reference' => 'PW260608141200ABCD12',
            'qr_string' => 'KHQR-STRING',
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->actingAs($user)
            ->getJson('/api/orders?tab=all')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.status', 'processing')
            ->assertJsonPath('data.0.payment_status', 'paid')
            ->assertJsonPath('data.0.payments.0.status', 'paid')
            ->assertJsonPath('data.0.payments.0.provider_status', 'APPROVED')
            ->assertJsonPath('data.0.payments.0.provider_approval_code', '112233');
    }

    public function test_callback_marks_order_paid_after_verification(): void
    {
        Http::fake([
            'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2' => Http::response([
                'data' => [
                    'payment_status' => 'APPROVED',
                    'apv' => '998877',
                    'transaction_date' => '2026-06-08 14:01:30',
                ],
                'status' => [
                    'code' => '00',
                    'message' => 'Success!',
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $order = $this->createPendingOrder($user, [
            'provider_reference' => 'PW260608140130ABCD12',
            'qr_string' => 'KHQR-STRING',
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/payments/payway/callback', [
            'tran_id' => 'PW260608140130ABCD12',
            'apv' => '998877',
            'status' => 0,
        ])->assertOk();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'paid',
            'provider_status' => 'APPROVED',
            'provider_approval_code' => '998877',
        ]);
    }

    /**
     * @param  array<string, mixed>  $paymentOverrides
     */
    private function createPendingOrder(User $user, array $paymentOverrides = []): Order
    {
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'placed_at' => now()->subMinutes(2),
        ]);

        $order->payments()->create(array_merge([
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
