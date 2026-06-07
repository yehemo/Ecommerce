<?php

namespace App\Services\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Services\Inventory\InventoryService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class AdminReportingService
{
    public const RANGES = ['today', '7d', '30d', 'all'];

    public function buildReport(string $range): array
    {
        $range = in_array($range, self::RANGES, true) ? $range : '30d';
        $startAt = $this->rangeStart($range);

        $ordersQuery = Order::query()
            ->when($startAt !== null, fn (Builder $query) => $query->where('placed_at', '>=', $startAt));

        $paidOrdersQuery = (clone $ordersQuery)->where('payment_status', 'paid');
        $paidOrders = $paidOrdersQuery->get([
            'id',
            'order_number',
            'status',
            'payment_status',
            'total_minor',
            'placed_at',
        ]);

        $totalOrders = (clone $ordersQuery)->count();
        $paidOrdersCount = $paidOrders->count();
        $pendingPaymentCount = (clone $ordersQuery)
            ->where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->count();
        $cancelledCount = (clone $ordersQuery)
            ->where(function (Builder $query) {
                $query->where('status', 'cancelled')
                    ->orWhere('payment_status', 'cancelled');
            })
            ->count();

        $grossRevenueMinor = (int) $paidOrders->sum('total_minor');
        $averageOrderValueMinor = $paidOrdersCount > 0
            ? (int) round($grossRevenueMinor / $paidOrdersCount)
            : 0;

        $lowStockQuery = ProductVariant::query()
            ->with(['product', 'optionValues.optionType']);
        $lowStockCount = (clone $lowStockQuery)
            ->where('stock_qty', '>', 0)
            ->where('stock_qty', '<=', InventoryService::LOW_STOCK_THRESHOLD)
            ->count();
        $outOfStockCount = (clone $lowStockQuery)
            ->where('stock_qty', 0)
            ->count();

        return [
            'range' => $range,
            'summary' => [
                'total_orders' => $totalOrders,
                'paid_orders' => $paidOrdersCount,
                'pending_payment_orders' => $pendingPaymentCount,
                'cancelled_orders' => $cancelledCount,
                'gross_revenue_minor' => $grossRevenueMinor,
                'average_order_value_minor' => $averageOrderValueMinor,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'currency' => 'USD',
            ],
            'status_breakdown' => [
                'pending_payment' => $pendingPaymentCount,
                'pending_shipping' => (clone $ordersQuery)
                    ->where('status', 'processing')
                    ->where('payment_status', 'paid')
                    ->count(),
                'shipped' => (clone $ordersQuery)
                    ->where('status', 'shipped')
                    ->where('payment_status', 'paid')
                    ->count(),
                'delivered' => (clone $ordersQuery)
                    ->where('status', 'delivered')
                    ->where('payment_status', 'paid')
                    ->count(),
                'cancelled' => $cancelledCount,
            ],
            'top_products' => $this->topProducts($paidOrders->pluck('id')),
            'low_stock_variants' => $this->lowStockVariants(),
        ];
    }

    private function rangeStart(string $range): ?Carbon
    {
        return match ($range) {
            'today' => now()->startOfDay(),
            '7d' => now()->subDays(7)->startOfDay(),
            '30d' => now()->subDays(30)->startOfDay(),
            default => null,
        };
    }

    private function topProducts(Collection $paidOrderIds): array
    {
        if ($paidOrderIds->isEmpty()) {
            return [];
        }

        return OrderItem::query()
            ->selectRaw('product_id, product_name, SUM(quantity) as units_sold, SUM(line_total_minor) as revenue_minor')
            ->whereIn('order_id', $paidOrderIds->all())
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('units_sold')
            ->orderByDesc('revenue_minor')
            ->limit(5)
            ->get()
            ->map(fn (OrderItem $item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'units_sold' => (int) $item->units_sold,
                'revenue_minor' => (int) $item->revenue_minor,
            ])
            ->all();
    }

    private function lowStockVariants(): array
    {
        return ProductVariant::query()
            ->with(['product', 'optionValues.optionType'])
            ->where('stock_qty', '<=', InventoryService::LOW_STOCK_THRESHOLD)
            ->orderBy('stock_qty')
            ->orderBy('sku')
            ->limit(8)
            ->get()
            ->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'stock_qty' => (int) $variant->stock_qty,
                'stock_state' => app(InventoryService::class)->stockState((int) $variant->stock_qty),
                'product' => [
                    'id' => $variant->product?->id,
                    'name' => $variant->product?->name,
                ],
                'option_summary' => $variant->optionValues->isNotEmpty()
                    ? $variant->optionValues
                        ->map(fn ($optionValue) => sprintf(
                            '%s: %s',
                            $optionValue->optionType?->name ?? 'Option',
                            $optionValue->value
                        ))
                        ->implode(' / ')
                    : 'No option values',
            ])
            ->all();
    }
}
