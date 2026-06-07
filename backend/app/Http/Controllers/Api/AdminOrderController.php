<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminOrderIndexRequest;
use App\Http\Requests\AdminUpdateOrderShipmentRequest;
use App\Http\Requests\AdminUpdateOrderStatusRequest;
use App\Http\Requests\UpdateOrderAddressesRequest;
use App\Models\Order;
use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    public function __construct(private readonly OrderLifecycleService $orderLifecycleService)
    {
    }

    public function index(AdminOrderIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $tab = $validated['tab'] ?? 'all';
        $search = trim((string) ($validated['search'] ?? ''));

        $this->orderLifecycleService->expireOverdueUnpaidOrders();

        $orders = Order::query()
            ->with(['user', 'items', 'addresses', 'payments', 'shipment'])
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                            $userQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($tab !== 'all', fn (Builder $query) => $this->applyTabFilter($query, $tab))
            ->orderByDesc('placed_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $orders,
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order = $this->orderLifecycleService->syncExpiredOrder($order);

        return response()->json([
            'data' => $order->loadMissing(['user', 'items', 'addresses', 'payments', 'shipment']),
        ]);
    }

    public function updateShipment(AdminUpdateOrderShipmentRequest $request, Order $order): JsonResponse
    {
        $order = $this->orderLifecycleService->syncExpiredOrder($order);
        $validated = $request->validated();

        if ($validated['status'] === 'shipped' && !$this->orderLifecycleService->canMarkShipped($order) && $order->status !== 'shipped') {
            return response()->json([
                'message' => 'Only paid processing orders can be marked as shipped.',
                'data' => $order->loadMissing(['user', 'items', 'addresses', 'payments', 'shipment']),
            ], 422);
        }

        if ($validated['status'] === 'delivered' && !$this->orderLifecycleService->canMarkDelivered($order)) {
            return response()->json([
                'message' => 'Only shipped paid orders can be marked as delivered.',
                'data' => $order->loadMissing(['user', 'items', 'addresses', 'payments', 'shipment']),
            ], 422);
        }

        $updatedOrder = $this->orderLifecycleService->updateShipment($order, $validated);

        return response()->json([
            'message' => $validated['status'] === 'delivered'
                ? 'Shipment updated and order marked as delivered.'
                : 'Shipment updated and order marked as shipped.',
            'data' => $updatedOrder,
        ]);
    }

    public function updateStatus(AdminUpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $order = $this->orderLifecycleService->syncExpiredOrder($order);
        return $this->cancelOrder($order);
    }

    public function updateAddresses(UpdateOrderAddressesRequest $request, Order $order): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($order, $validated) {
            foreach (['shipping_address' => 'shipping', 'billing_address' => 'billing'] as $key => $type) {
                if (!array_key_exists($key, $validated)) {
                    continue;
                }

                $order->addresses()
                    ->where('type', $type)
                    ->update([
                        'full_name' => $validated[$key]['full_name'],
                        'phone' => $validated[$key]['phone'],
                        'line_1' => $validated[$key]['line_1'],
                        'line_2' => $validated[$key]['line_2'] ?? null,
                        'city' => $validated[$key]['city'],
                        'postal_code' => $validated[$key]['postal_code'],
                    ]);
            }
        });

        return response()->json([
            'message' => 'Order snapshot addresses updated successfully.',
            'data' => $order->fresh()->load(['user', 'items', 'addresses', 'payments', 'shipment']),
        ]);
    }

    private function cancelOrder(Order $order): JsonResponse
    {
        if (!$this->orderLifecycleService->adminCanCancel($order)) {
            return response()->json([
                'message' => 'Only actionable unpaid pending orders can be cancelled.',
                'data' => $order->loadMissing(['user', 'items', 'addresses', 'payments', 'shipment']),
            ], 422);
        }

        $updatedOrder = $this->orderLifecycleService->adminCancel($order);

        return response()->json([
            'message' => 'Order cancelled successfully.',
            'data' => $updatedOrder,
        ]);
    }

    private function applyTabFilter(Builder $query, string $tab): Builder
    {
        return match ($tab) {
            'pending_payment' => $query->where('status', 'pending')->where('payment_status', 'unpaid'),
            'pending_shipping' => $query->where('status', 'processing')->where('payment_status', 'paid'),
            'shipped' => $query->where('status', 'shipped')->where('payment_status', 'paid'),
            'delivered' => $query->where('status', 'delivered')->where('payment_status', 'paid'),
            'cancelled' => $query->where(function (Builder $builder) {
                $builder->where('status', 'cancelled')->orWhere('payment_status', 'cancelled');
            }),
            default => $query,
        };
    }
}
