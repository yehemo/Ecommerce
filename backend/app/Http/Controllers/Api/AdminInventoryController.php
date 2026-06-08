<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminAdjustInventoryRequest;
use App\Http\Requests\AdminInventoryIndexRequest;
use App\Models\ProductVariant;
use App\Services\Inventory\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class AdminInventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventoryService)
    {
    }

    public function index(AdminInventoryIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $tab = $validated['tab'] ?? 'all';
        $search = trim((string) ($validated['search'] ?? ''));

        $baseQuery = ProductVariant::query()
            ->with(['product', 'optionValues.optionType'])
            ->withMax('inventoryMovements', 'created_at')
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner->where('sku', 'like', "%{$search}%")
                        ->orWhereHas('product', function (Builder $productQuery) use ($search) {
                            $productQuery->where('name', 'like', "%{$search}%");
                        });
                });
            });

        $variants = (clone $baseQuery)
            ->when($tab !== 'all', fn (Builder $query) => $this->applyTabFilter($query, $tab))
            ->orderBy('stock_qty')
            ->orderBy('sku')
            ->get();

        $summaryQuery = ProductVariant::query();

        return response()->json([
            'data' => $variants->map(fn (ProductVariant $variant) => $this->transformVariant($variant)),
            'meta' => [
                'total' => (clone $summaryQuery)->count(),
                'low_stock_count' => (clone $summaryQuery)
                    ->where('stock_qty', '>', 0)
                    ->where('stock_qty', '<=', InventoryService::LOW_STOCK_THRESHOLD)
                    ->count(),
                'out_of_stock_count' => (clone $summaryQuery)->where('stock_qty', 0)->count(),
                'low_stock_threshold' => InventoryService::LOW_STOCK_THRESHOLD,
            ],
        ]);
    }

    public function show(ProductVariant $variant): JsonResponse
    {
        return response()->json([
            'data' => $this->transformVariant(
                $variant->load([
                    'product',
                    'optionValues.optionType',
                    'inventoryMovements' => fn ($query) => $query
                        ->with(['actor', 'order'])
                        ->latest()
                        ->limit(25),
                ])
            ),
        ]);
    }

    public function adjust(AdminAdjustInventoryRequest $request, ProductVariant $variant): JsonResponse
    {
        $updatedVariant = $this->inventoryService->adjust(
            $variant,
            $request->user(),
            $request->validated('action'),
            (int) $request->validated('quantity'),
            $request->validated('reason'),
        );

        return response()->json([
            'message' => 'Inventory adjusted successfully.',
            'data' => $this->transformVariant(
                $updatedVariant->fresh()->load([
                    'product',
                    'optionValues.optionType',
                    'inventoryMovements' => fn ($query) => $query
                        ->with(['actor', 'order'])
                        ->latest()
                        ->limit(25),
                ])
            ),
        ]);
    }

    private function applyTabFilter(Builder $query, string $tab): Builder
    {
        return match ($tab) {
            'low_stock' => $query
                ->where('stock_qty', '>', 0)
                ->where('stock_qty', '<=', InventoryService::LOW_STOCK_THRESHOLD),
            'out_of_stock' => $query->where('stock_qty', 0),
            default => $query,
        };
    }

    private function transformVariant(ProductVariant $variant): array
    {
        $state = $this->inventoryService->stockState((int) $variant->stock_qty);

        return [
            'id' => $variant->id,
            'sku' => $variant->sku,
            'stock_qty' => (int) $variant->stock_qty,
            'status' => $variant->status,
            'stock_state' => $state,
            'is_low_stock' => $state === 'low_stock',
            'is_out_of_stock' => $state === 'out_of_stock',
            'latest_movement_at' => $variant->inventory_movements_max_created_at,
            'product' => [
                'id' => $variant->product?->id,
                'name' => $variant->product?->name,
            ],
            'option_values' => $variant->optionValues->map(fn ($optionValue) => [
                'id' => $optionValue->id,
                'value' => $optionValue->value,
                'option_type' => $optionValue->optionType?->name,
            ])->values(),
            'inventory_movements' => $variant->relationLoaded('inventoryMovements')
                ? $variant->inventoryMovements->map(fn ($movement) => [
                    'id' => $movement->id,
                    'reason' => $movement->reason,
                    'quantity_delta' => (int) $movement->quantity_delta,
                    'quantity_before' => (int) $movement->quantity_before,
                    'quantity_after' => (int) $movement->quantity_after,
                    'created_at' => $movement->created_at?->toISOString(),
                    'actor' => $movement->actor ? [
                        'id' => $movement->actor->id,
                        'name' => $movement->actor->name,
                        'email' => $movement->actor->email,
                    ] : null,
                    'order' => $movement->order ? [
                        'id' => $movement->order->id,
                        'order_number' => $movement->order->order_number,
                    ] : null,
                ])->values()
                : [],
        ];
    }
}
