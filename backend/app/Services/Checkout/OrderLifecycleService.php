<?php

namespace App\Services\Checkout;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class OrderLifecycleService
{
    public function syncExpiredOrder(Order $order): Order
    {
        $order = $order->loadMissing(['payments', 'items']);

        if (!$this->shouldExpire($order)) {
            return $order;
        }

        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->shouldExpire($lockedOrder)) {
                return $lockedOrder;
            }

            return $this->cancelOrder($lockedOrder);
        });
    }

    public function canEditAddresses(Order $order): bool
    {
        return $this->isActionablePendingOrder($order);
    }

    public function markPaid(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->canPay($lockedOrder)) {
                return $lockedOrder;
            }

            $payment = $this->pendingPayment($lockedOrder);
            $paidAt = now();

            $payment->forceFill([
                'status' => 'paid',
                'paid_at' => $paidAt,
            ])->save();

            $lockedOrder->forceFill([
                'status' => 'processing',
                'payment_status' => 'paid',
            ])->save();

            return $lockedOrder->fresh()->load(['items', 'addresses', 'payments']);
        });
    }

    public function cancel(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->canCancel($lockedOrder)) {
                return $lockedOrder;
            }

            return $this->cancelOrder($lockedOrder);
        });
    }

    public function canPay(Order $order): bool
    {
        return $this->isActionablePendingOrder($order);
    }

    public function canCancel(Order $order): bool
    {
        return $this->isActionablePendingOrder($order);
    }

    public function expireOverdueUnpaidOrders(): int
    {
        $cancelled = 0;

        Order::query()
            ->where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->whereNotNull('placed_at')
            ->where('placed_at', '<=', now()->subMinutes(Order::ACTION_WINDOW_MINUTES))
            ->with('payments')
            ->orderBy('placed_at')
            ->chunkById(100, function ($orders) use (&$cancelled) {
                foreach ($orders as $order) {
                    $result = DB::transaction(function () use ($order) {
                        $lockedOrder = Order::query()
                            ->whereKey($order->id)
                            ->with(['payments', 'items'])
                            ->lockForUpdate()
                            ->first();

                        if (!$lockedOrder || !$this->shouldExpire($lockedOrder)) {
                            return false;
                        }

                        $this->cancelOrder($lockedOrder);

                        return true;
                    });

                    if ($result) {
                        $cancelled++;
                    }
                }
            }, column: 'id');

        return $cancelled;
    }

    public function shouldExpire(Order $order): bool
    {
        return $this->isPendingUnpaidWithPendingPayment($order)
            && !$this->isWithinActionWindow($order);
    }

    public function isWithinActionWindow(Order $order): bool
    {
        $deadline = $order->actionDeadline();

        return $deadline !== null && now()->lt($deadline);
    }

    private function isActionablePendingOrder(Order $order): bool
    {
        return $this->isPendingUnpaidWithPendingPayment($order)
            && $this->isWithinActionWindow($order);
    }

    private function isPendingUnpaidWithPendingPayment(Order $order): bool
    {
        return $order->status === 'pending'
            && $order->payment_status === 'unpaid'
            && $this->pendingPayment($order)?->status === 'pending';
    }

    private function pendingPayment(Order $order): ?Payment
    {
        return $order->payments->sortBy('created_at')->first();
    }

    private function cancelOrder(Order $order): Order
    {
        $this->restoreReservedStock($order);

        $payment = $this->pendingPayment($order);

        if ($payment && $payment->status !== 'cancelled') {
            $payment->forceFill([
                'status' => 'cancelled',
                'paid_at' => null,
            ])->save();
        }

        $order->forceFill([
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ])->save();

        return $order->fresh()->load(['items', 'addresses', 'payments']);
    }

    private function restoreReservedStock(Order $order): void
    {
        $variantQuantities = $order->items
            ->filter(fn ($item) => $item->product_variant_id !== null)
            ->groupBy('product_variant_id')
            ->map(fn ($items) => $items->sum('quantity'));

        if ($variantQuantities->isEmpty()) {
            return;
        }

        $variants = \App\Models\ProductVariant::query()
            ->whereIn('id', $variantQuantities->keys())
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($variantQuantities as $variantId => $quantity) {
            $variants->get($variantId)?->increment('stock_qty', $quantity);
        }
    }
}
