<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartItemController extends Controller
{
    public function store(StoreCartItemRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $variant = ProductVariant::query()->findOrFail($validated['product_variant_id']);
        $quantity = (int) $validated['quantity'];

        if ($variant->stock_qty < $quantity) {
            return response()->json([
                'message' => 'Requested quantity exceeds available stock.',
            ], 422);
        }

        $cart = $this->activeCart($request);
        $cartItem = $cart->items()->where('product_variant_id', $variant->id)->first();

        if ($cartItem) {
            $newQuantity = $cartItem->quantity + $quantity;

            if ($variant->stock_qty < $newQuantity) {
                return response()->json([
                    'message' => 'Requested quantity exceeds available stock.',
                ], 422);
            }

            $cartItem->update([
                'quantity' => $newQuantity,
                'unit_price_minor' => $variant->price_minor,
            ]);
        } else {
            $cartItem = $cart->items()->create([
                'product_variant_id' => $variant->id,
                'quantity' => $quantity,
                'unit_price_minor' => $variant->price_minor,
            ]);
        }

        return response()->json([
            'message' => 'Cart item saved successfully.',
            'data' => $this->loadCartItem($cartItem),
        ], 201);
    }

    public function update(UpdateCartItemRequest $request, CartItem $cartItem): JsonResponse
    {
        $this->authorizeCartItem($request, $cartItem);

        $quantity = (int) $request->validated()['quantity'];
        $variant = $cartItem->productVariant;

        if ($variant->stock_qty < $quantity) {
            return response()->json([
                'message' => 'Requested quantity exceeds available stock.',
            ], 422);
        }

        $cartItem->update([
            'quantity' => $quantity,
            'unit_price_minor' => $variant->price_minor,
        ]);

        return response()->json([
            'message' => 'Cart item updated successfully.',
            'data' => $this->loadCartItem($cartItem),
        ]);
    }

    public function destroy(Request $request, CartItem $cartItem): JsonResponse
    {
        $this->authorizeCartItem($request, $cartItem);

        $cartItem->delete();

        return response()->json([
            'message' => 'Cart item removed successfully.',
        ]);
    }

    private function activeCart(Request $request): Cart
    {
        return Cart::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'status' => 'active',
        ]);
    }

    private function authorizeCartItem(Request $request, CartItem $cartItem): void
    {
        abort_unless($cartItem->cart->user_id === $request->user()->id, 403);
    }

    private function loadCartItem(CartItem $cartItem): CartItem
    {
        return $cartItem->load([
            'cart',
            'productVariant.product.images',
            'productVariant.optionValues.optionType',
        ]);
    }
}
