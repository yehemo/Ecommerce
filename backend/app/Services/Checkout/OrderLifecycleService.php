<?php

namespace App\Services\Checkout;

use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Payment;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Facades\DB;

class OrderLifecycleService
{
    public function __construct(private readonly InventoryService $inventoryService)
    {
    }

    public function syncExpiredOrder(Order $order): Order
    {
        $order = $order->loadMissing(['payments', 'items', 'shipment']);

        if (!$this->shouldExpire($order)) {
            return $order;
        }

        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
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

    public function adminCanCancel(Order $order): bool
    {
        return $this->isActionablePendingOrder($order);
    }

    public function canMarkShipped(Order $order): bool
    {
        return $order->status === 'processing' && $order->payment_status === 'paid';
    }

    public function canMarkDelivered(Order $order): bool
    {
        return $order->status === 'shipped' && $order->payment_status === 'paid';
    }

    public function updateShipment(Order $order, array $shipmentData): Order
    {
        return DB::transaction(function () use ($order, $shipmentData) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($shipmentData['status'] === 'shipped') {
                if (!$this->canMarkShipped($lockedOrder) && $lockedOrder->status !== 'shipped') {
                    return $lockedOrder;
                }

                $this->persistShipment($lockedOrder, [
                    ...$shipmentData,
                    'status' => 'shipped',
                    'shipped_at' => $lockedOrder->shipment?->shipped_at ?? now(),
                    'delivered_at' => null,
                ]);

                if ($lockedOrder->status !== 'shipped') {
                    $lockedOrder->forceFill([
                        'status' => 'shipped',
                    ])->save();
                }

                return $lockedOrder->fresh()->load(['user', 'items', 'addresses', 'payments', 'shipment']);
            }

            if (!$this->canMarkDelivered($lockedOrder)) {
                return $lockedOrder;
            }

            $this->persistShipment($lockedOrder, [
                ...$shipmentData,
                'status' => 'delivered',
                'shipped_at' => $lockedOrder->shipment?->shipped_at ?? now(),
                'delivered_at' => $lockedOrder->shipment?->delivered_at ?? now(),
            ]);

            $lockedOrder->forceFill([
                'status' => 'delivered',
            ])->save();

            return $lockedOrder->fresh()->load(['user', 'items', 'addresses', 'payments', 'shipment']);
        });
    }

    public function markPaid(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
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

            return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
        });
    }

    public function cancel(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->canCancel($lockedOrder)) {
                return $lockedOrder;
            }

            return $this->cancelOrder($lockedOrder);
        });
    }

    public function adminCancel(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->adminCanCancel($lockedOrder)) {
                return $lockedOrder;
            }

            return $this->cancelOrder($lockedOrder);
        });
    }

    public function markShipped(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->canMarkShipped($lockedOrder)) {
                return $lockedOrder;
            }

            $lockedOrder->forceFill([
                'status' => 'shipped',
            ])->save();

            return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'user', 'shipment']);
        });
    }

    public function markDelivered(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->with(['payments', 'items', 'shipment'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$this->canMarkDelivered($lockedOrder)) {
                return $lockedOrder;
            }

            $lockedOrder->forceFill([
                'status' => 'delivered',
            ])->save();

            return $lockedOrder->fresh()->load(['items', 'addresses', 'payments', 'user', 'shipment']);
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
                            ->with(['payments', 'items', 'shipment'])
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

    private function persistShipment(Order $order, array $shipmentData): OrderShipment
    {
        $shipment = $order->shipment ?? new OrderShipment([
            'order_id' => $order->id,
        ]);

        $shipment->forceFill([
            'carrier' => $shipmentData['carrier'],
            'tracking_number' => $shipmentData['tracking_number'],
            'tracking_url' => $shipmentData['tracking_url'] ?? null,
            'notes' => $shipmentData['notes'] ?? null,
            'status' => $shipmentData['status'],
            'shipped_at' => $shipmentData['shipped_at'] ?? $shipment->shipped_at,
            'delivered_at' => $shipmentData['delivered_at'] ?? $shipment->delivered_at,
        ])->save();

        return $shipment;
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

        return $order->fresh()->load(['items', 'addresses', 'payments', 'shipment']);
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
            $variant = $variants->get($variantId);

            if ($variant) {
                $this->inventoryService->restoreForCancellation($variant, $quantity, $order);
            }
        }
    }
}
