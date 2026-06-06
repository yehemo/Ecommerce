<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderAddressesRequest;
use App\Models\Order;
use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OrderAddressController extends Controller
{
    public function __construct(private readonly OrderLifecycleService $orderLifecycleService)
    {
    }

    public function update(UpdateOrderAddressesRequest $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);

        $order = $this->orderLifecycleService->syncExpiredOrder($order);

        if (!$this->orderLifecycleService->canEditAddresses($order)) {
            return response()->json([
                'message' => 'Order addresses can only be updated within 10 minutes of checkout.',
                'data' => $order->loadMissing(['items', 'addresses', 'payments']),
            ], 422);
        }

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
            'message' => 'Order addresses updated successfully.',
            'data' => $order->fresh()->load(['items', 'addresses', 'payments']),
        ]);
    }
}
