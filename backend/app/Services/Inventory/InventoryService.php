<?php

namespace App\Services\Inventory;

use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public const LOW_STOCK_THRESHOLD = 5;

    public const REASONS = [
        'manual_adjustment',
        'restock',
        'damage',
        'correction',
        'checkout_reservation',
        'cancellation_restore',
    ];

    public const ADMIN_REASONS = [
        'manual_adjustment',
        'restock',
        'damage',
        'correction',
    ];

    public function reserveForCheckout(ProductVariant $variant, int $quantity, Order $order): ProductVariant
    {
        return $this->applyDelta(
            $variant,
            -$quantity,
            'checkout_reservation',
            actor: null,
            order: $order,
        );
    }

    public function restoreForCancellation(ProductVariant $variant, int $quantity, Order $order): ProductVariant
    {
        return $this->applyDelta(
            $variant,
            $quantity,
            'cancellation_restore',
            actor: null,
            order: $order,
        );
    }

    public function adjust(ProductVariant $variant, User $actor, string $action, int $quantity, string $reason): ProductVariant
    {
        return DB::transaction(function () use ($variant, $actor, $action, $quantity, $reason) {
            $lockedVariant = ProductVariant::query()
                ->whereKey($variant->id)
                ->with(['product', 'optionValues.optionType'])
                ->lockForUpdate()
                ->firstOrFail();

            $before = (int) $lockedVariant->stock_qty;

            $target = match ($action) {
                'set' => $quantity,
                'increment' => $before + $quantity,
                'decrement' => $before - $quantity,
            };

            if ($target < 0) {
                throw ValidationException::withMessages([
                    'quantity' => ['Inventory cannot be reduced below zero.'],
                ]);
            }

            if ($target === $before) {
                throw ValidationException::withMessages([
                    'quantity' => ['This adjustment would not change stock.'],
                ]);
            }

            return $this->recordStockChange(
                $lockedVariant,
                $target - $before,
                $reason,
                actor: $actor,
                order: null,
            );
        });
    }

    public function stockState(int $stockQty): string
    {
        if ($stockQty === 0) {
            return 'out_of_stock';
        }

        if ($stockQty <= self::LOW_STOCK_THRESHOLD) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    private function applyDelta(
        ProductVariant $variant,
        int $delta,
        string $reason,
        ?User $actor = null,
        ?Order $order = null,
    ): ProductVariant {
        return $this->recordStockChange($variant, $delta, $reason, $actor, $order);
    }

    private function recordStockChange(
        ProductVariant $variant,
        int $delta,
        string $reason,
        ?User $actor = null,
        ?Order $order = null,
    ): ProductVariant {
        $before = (int) $variant->stock_qty;
        $after = $before + $delta;

        if ($after < 0) {
            throw ValidationException::withMessages([
                'stock' => ["Insufficient stock for SKU {$variant->sku}."],
            ]);
        }

        $variant->forceFill([
            'stock_qty' => $after,
        ])->save();

        $variant->inventoryMovements()->create([
            'actor_user_id' => $actor?->id,
            'order_id' => $order?->id,
            'reason' => $reason,
            'quantity_delta' => $delta,
            'quantity_before' => $before,
            'quantity_after' => $after,
        ]);

        return $variant;
    }
}
