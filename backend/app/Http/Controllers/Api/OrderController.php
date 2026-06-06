<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderLifecycleService $orderLifecycleService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tab' => ['nullable', 'string', 'in:all,pending_payment,pending_shipping,cancelled'],
        ]);

        $tab = $validated['tab'] ?? 'all';

        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items', 'addresses', 'payments'])
            ->orderByDesc('placed_at')
            ->orderByDesc('created_at')
            ->get();

        $orders = $this->syncExpiredOrders($orders);

        if ($tab !== 'all') {
            $orders = $orders
                ->filter(fn (Order $order) => $this->matchesTab($order, $tab))
                ->values();
        }

        return response()->json([
            'data' => $orders->values(),
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);

        $order = $this->orderLifecycleService->syncExpiredOrder($order);

        return response()->json([
            'data' => $order->loadMissing(['items', 'addresses', 'payments']),
        ]);
    }

    public function pay(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);

        $order = $this->orderLifecycleService->syncExpiredOrder($order);

        if (!$this->orderLifecycleService->canPay($order)) {
            return response()->json([
                'message' => 'This order can no longer be marked as paid.',
                'data' => $order->loadMissing(['items', 'addresses', 'payments']),
            ], 422);
        }

        $updatedOrder = $this->orderLifecycleService->markPaid($order);

        return response()->json([
            'message' => 'Order marked as paid.',
            'data' => $updatedOrder,
        ]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);

        $order = $this->orderLifecycleService->syncExpiredOrder($order);

        if (!$this->orderLifecycleService->canCancel($order)) {
            return response()->json([
                'message' => 'This order can no longer be cancelled.',
                'data' => $order->loadMissing(['items', 'addresses', 'payments']),
            ], 422);
        }

        $updatedOrder = $this->orderLifecycleService->cancel($order);

        return response()->json([
            'message' => 'Order cancelled successfully.',
            'data' => $updatedOrder,
        ]);
    }

    private function matchesTab(Order $order, string $tab): bool
    {
        return match ($tab) {
            'pending_payment' => $order->status === 'pending' && $order->payment_status === 'unpaid',
            'pending_shipping' => $order->status === 'processing' && $order->payment_status === 'paid',
            'cancelled' => $order->status === 'cancelled' || $order->payment_status === 'cancelled',
            default => true,
        };
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return Collection<int, Order>
     */
    private function syncExpiredOrders(Collection $orders): Collection
    {
        return $orders
            ->map(fn (Order $order) => $this->orderLifecycleService->syncExpiredOrder($order))
            ->sortByDesc(fn (Order $order) => $order->placed_at?->getTimestamp() ?? $order->created_at?->getTimestamp() ?? 0)
            ->values();
    }
}
