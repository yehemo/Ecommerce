<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\PayWayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayWayCallbackController extends Controller
{
    public function __construct(private readonly PayWayService $payWayService)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $order = $this->payWayService->reconcileFromCallback($request->all());

        return response()->json([
            'message' => $order ? 'Callback processed.' : 'Callback ignored.',
        ]);
    }
}
