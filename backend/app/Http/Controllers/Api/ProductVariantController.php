<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductVariantRequest;
use App\Http\Requests\UpdateProductVariantRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;

class ProductVariantController extends Controller
{
    /**
     * GET /api/products/{product}/variants
     * List all variants for a specific product.
     */
    public function index(Product $product): JsonResponse
    {
        $variants = $product->variants()->with('optionValues')->get();

        return response()->json([
            'data' => $variants,
        ]);
    }

    /**
     * POST /api/products/{product}/variants
     * Create a new variant and optionally attach option values to it.
     *
     * Payload example:
     * {
     *   "sku": "TSHIRT-RED-XL",
     *   "price_minor": 2999,
     *   "stock_qty": 50,
     *   "status": "active",
     *   "option_value_ids": ["uuid-1", "uuid-2"]
     * }
     */
    public function store(StoreProductVariantRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        $variant = $product->variants()->create([
            'sku'         => $validated['sku'],
            'price_minor' => $validated['price_minor'],
            'stock_qty'   => $validated['stock_qty'] ?? 0,
            'status'      => $validated['status'] ?? 'active',
        ]);

        if (!empty($validated['option_value_ids'])) {
            $variant->optionValues()->attach($validated['option_value_ids']);
        }

        return response()->json([
            'message' => 'Variant created successfully.',
            'data'    => $variant->load('optionValues'),
        ], 201);
    }

    /**
     * GET /api/variants/{variant}
     * Show a single variant with its option values.
     */
    public function show(ProductVariant $variant): JsonResponse
    {
        return response()->json([
            'data' => $variant->load('optionValues', 'product'),
        ]);
    }

    /**
     * PUT /api/variants/{variant}
     * Update a variant's price, stock, status, SKU, or its attached option values.
     *
     * Payload example:
     * {
     *   "price_minor": 3499,
     *   "stock_qty": 30,
     *   "status": "inactive",
     *   "option_value_ids": ["uuid-1", "uuid-3"]   // full replacement sync
     * }
     */
    public function update(UpdateProductVariantRequest $request, ProductVariant $variant): JsonResponse
    {
        $validated = $request->validated();

        $variant->update([
            'sku'         => $validated['sku']         ?? $variant->sku,
            'price_minor' => $validated['price_minor'] ?? $variant->price_minor,
            'stock_qty'   => $validated['stock_qty']   ?? $variant->stock_qty,
            'status'      => $validated['status']      ?? $variant->status,
        ]);

        // If option_value_ids provided, do a full sync (replaces existing pivot rows)
        if (array_key_exists('option_value_ids', $validated)) {
            $variant->optionValues()->sync($validated['option_value_ids']);
        }

        return response()->json([
            'message' => 'Variant updated successfully.',
            'data'    => $variant->fresh()->load('optionValues'),
        ]);
    }

    /**
     * DELETE /api/variants/{variant}
     * Delete a variant (pivot rows cascade automatically via DB constraint).
     */
    public function destroy(ProductVariant $variant): JsonResponse
    {
        // Detach option values from pivot before deleting
        $variant->optionValues()->detach();
        $variant->delete();

        return response()->json([
            'message' => 'Variant deleted successfully.',
        ]);
    }
}
