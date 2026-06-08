<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PayWayService
{
    public function __construct(
        private readonly HttpFactory $http,
        private readonly OrderLifecycleService $orderLifecycleService,
    ) {
    }

    public function initiateQrPayment(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'addresses', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->orderLifecycleService->canPay($lockedOrder)) {
                return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
            }

            $payment = $this->pendingPayment($lockedOrder);

            if (!$payment) {
                throw new RuntimeException('Missing pending payment record.');
            }

            if (
                $payment->qr_string
                && $payment->expires_at
                && now()->lt($payment->expires_at)
            ) {
                return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
            }

            $payload = $this->buildGenerateQrPayload($lockedOrder, $payment);
            $expiresAt = $payload['_expires_at'];
            unset($payload['_expires_at']);
            try {
                $response = $this->httpClient()
                    ->post('/api/payment-gateway/v1/payments/generate-qr', $payload)
                    ->throw()
                    ->json();
            } catch (RequestException $exception) {
                throw new RuntimeException($this->providerErrorMessage($exception), previous: $exception);
            }

            $statusCode = (string) data_get($response, 'status.code', '');

            if ($statusCode !== '0') {
                throw new RuntimeException(data_get($response, 'status.message', 'PayWay QR generation failed.'));
            }

            $payment->forceFill([
                'provider' => 'payway',
                'provider_reference' => $payload['tran_id'],
                'provider_status' => 'PENDING',
                'provider_approval_code' => null,
                'qr_string' => $response['qrString'] ?? null,
                'qr_image' => $response['qrImage'] ?? null,
                'deeplink' => $response['abapay_deeplink'] ?? null,
                'callback_payload' => null,
                'expires_at' => $expiresAt,
                'verified_at' => null,
                'paid_at' => null,
                'status' => 'pending',
            ])->save();

            return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
        });
    }

    public function reconcileFromCallback(array $callbackPayload): ?Order
    {
        $tranId = (string) ($callbackPayload['tran_id'] ?? '');

        if ($tranId === '') {
            return null;
        }

        $payment = Payment::query()
            ->where('provider', 'payway')
            ->where('provider_reference', $tranId)
            ->first();

        if (!$payment) {
            return null;
        }

        $verification = $this->checkTransaction($tranId);

        return $this->applyVerification($payment, $verification, $callbackPayload);
    }

    public function syncPaymentStatus(Order $order): Order
    {
        $order = $order->loadMissing(['payments', 'items', 'addresses', 'shipment']);
        $payment = $this->pendingPayment($order);

        if (
            !$payment
            || $payment->provider !== 'payway'
            || $payment->status !== 'pending'
            || !$payment->provider_reference
        ) {
            return $order;
        }

        try {
            $verification = $this->checkTransaction($payment->provider_reference);

            return $this->applyVerification($payment, $verification);
        } catch (\Throwable) {
            return $order;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function checkTransaction(string $tranId): array
    {
        $reqTime = now('UTC')->format('YmdHis');
        $payload = [
            'req_time' => $reqTime,
            'merchant_id' => $this->merchantId(),
            'tran_id' => $tranId,
        ];

        $payload['hash'] = $this->sign(
            $payload['req_time'].$payload['merchant_id'].$payload['tran_id']
        );

        try {
            return $this->httpClient()
                ->post('/api/payment-gateway/v1/payments/check-transaction-2', $payload)
                ->throw()
                ->json();
        } catch (RequestException $exception) {
            throw new RuntimeException($this->providerErrorMessage($exception), previous: $exception);
        }
    }

    /**
     * @param  array<string, mixed>  $verification
     * @param  array<string, mixed>|null  $callbackPayload
     */
    private function applyVerification(Payment $payment, array $verification, ?array $callbackPayload = null): Order
    {
        return DB::transaction(function () use ($payment, $verification, $callbackPayload) {
            $lockedPayment = Payment::query()
                ->whereKey($payment->id)
                ->lockForUpdate()
                ->firstOrFail();

            $order = Order::query()
                ->whereKey($lockedPayment->order_id)
                ->with(['payments', 'items', 'addresses', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            $providerStatus = (string) data_get($verification, 'data.payment_status', data_get($verification, 'status.message', 'PENDING'));
            $approvalCode = data_get($verification, 'data.apv');

            $lockedPayment->forceFill([
                'provider_status' => $providerStatus,
                'provider_approval_code' => $approvalCode,
                'callback_payload' => $callbackPayload ?? $lockedPayment->callback_payload,
                'verified_at' => now(),
            ])->save();

            if ($this->isApprovedVerification($verification) && $this->orderLifecycleService->canPay($order)) {
                return $this->orderLifecycleService->markPaidFromProvider($order, [
                    'provider_status' => $providerStatus,
                    'provider_approval_code' => $approvalCode,
                    'callback_payload' => $callbackPayload ?? $lockedPayment->callback_payload,
                    'verified_at' => now(),
                    'paid_at' => $this->verifiedPaidAt($verification),
                ]);
            }

            return $order->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
        });
    }

    /**
     * @param  array<string, mixed>  $verification
     */
    private function isApprovedVerification(array $verification): bool
    {
        return (string) data_get($verification, 'status.code') === '00'
            && Str::upper((string) data_get($verification, 'data.payment_status')) === 'APPROVED';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildGenerateQrPayload(Order $order, Payment $payment): array
    {
        $reqTime = now('UTC')->format('YmdHis');
        $expiresAt = $order->actionDeadline() ?? now()->addMinutes(Order::ACTION_WINDOW_MINUTES);
        $tranId = $this->generateTransactionId();
        $amount = (float) number_format($payment->amount_minor / 100, 2, '.', '');

        $payload = [
            'req_time' => $reqTime,
            'merchant_id' => $this->merchantId(),
            'tran_id' => $tranId,
            'amount' => $amount,
            'payment_option' => config('services.payway.payment_option', 'abapay_khqr'),
            'currency' => $payment->currency,
            'qr_image_template' => config('services.payway.qr_image_template', 'template3_color'),
        ];

        $hashString = implode('', [
            (string) $payload['req_time'],
            (string) $payload['merchant_id'],
            (string) $payload['tran_id'],
            (string) $payload['amount'],
            (string) $payload['payment_option'],
            (string) $payload['currency'],
            (string) $payload['qr_image_template'],
        ]);

        $payload['hash'] = $this->sign($hashString);

        $payload['_expires_at'] = $expiresAt;

        return $payload;
    }

    private function sign(string $payload): string
    {
        return base64_encode(hash_hmac('sha512', $payload, $this->publicKey(), true));
    }

    private function httpClient()
    {
        return $this->http
            ->baseUrl(rtrim((string) config('services.payway.base_url'), '/'))
            ->timeout((int) config('services.payway.timeout', 15))
            ->acceptJson()
            ->asJson();
    }

    private function merchantId(): string
    {
        $merchantId = (string) config('services.payway.merchant_id');

        if ($merchantId === '') {
            throw new RuntimeException('Missing PayWay merchant id configuration.');
        }

        return $merchantId;
    }

    private function publicKey(): string
    {
        $publicKey = (string) config('services.payway.public_key');

        if ($publicKey === '') {
            throw new RuntimeException('Missing PayWay public key configuration.');
        }

        return $publicKey;
    }

    private function generateTransactionId(): string
    {
        return 'PW'.now('UTC')->format('ymdHis').Str::upper(Str::random(6));
    }

    /**
     * @param  array<string, mixed>  $verification
     */
    private function verifiedPaidAt(array $verification): Carbon
    {
        $timestamp = data_get($verification, 'data.transaction_date');

        if (is_string($timestamp) && $timestamp !== '') {
            return Carbon::parse($timestamp);
        }

        return now();
    }

    private function pendingPayment(Order $order): ?Payment
    {
        return $order->payments->sortBy('created_at')->first();
    }

    private function providerErrorMessage(RequestException $exception): string
    {
        $response = $exception->response;

        if (!$response) {
            return 'PayWay request failed.';
        }

        $json = $response->json();

        if (!is_array($json)) {
            return 'PayWay request failed.';
        }

        $message = (string) data_get($json, 'status.message', 'PayWay request failed.');
        $errors = data_get($json, 'status.errors');

        if (!is_array($errors) || $errors === []) {
            return $message;
        }

        $flattened = collect($errors)
            ->map(function ($value, $key) {
                if (is_array($value)) {
                    return $key.': '.implode(', ', array_map('strval', $value));
                }

                return $key.': '.(string) $value;
            })
            ->implode(' | ');

        return trim($message.' '.$flattened);
    }
}
