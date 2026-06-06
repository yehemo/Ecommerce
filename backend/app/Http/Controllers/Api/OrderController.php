<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderLifecycleService $orderLifecycleService)
    {
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
}
