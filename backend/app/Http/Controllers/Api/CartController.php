<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $cart = Cart::query()
            ->with([
                'items.productVariant.product',
                'items.productVariant.optionValues.optionType',
            ])
            ->firstOrCreate([
                'user_id' => $request->user()->id,
                'status' => 'active',
            ]);

        return response()->json([
            'data' => $cart,
        ]);
    }
}
