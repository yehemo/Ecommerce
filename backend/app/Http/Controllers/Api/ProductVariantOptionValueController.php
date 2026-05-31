<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductVariantOptionValueRequest;
use App\Http\Requests\UpdateProductVariantOptionValueRequest;
use App\Models\ProductVariant;
use App\Models\ProductOptionValue;
use Illuminate\Http\JsonResponse;

class ProductVariantOptionValueController extends Controller
{
    /**
     * GET /api/variants/{variant}/option-values
     * List all option values currently attached to a variant.
     *
     * e.g. variant "TSHIRT-RED-XL" -> ["Red", "XL"]
     */
    public function index(ProductVariant $variant): JsonResponse
    {
        return response()->json([
            'data' => $variant->optionValues()->with('optionType')->get(),
        ]);
    }

    /**
     * POST /api/variants/{variant}/option-values
     * Attach one or more option values to a variant.
     *
     * Payload: { "option_value_ids": ["uuid-1", "uuid-2"] }
     *
     * Uses syncWithoutDetaching so existing attachments are preserved
     * and duplicate pivots are never created.
     */
    public function store(StoreProductVariantOptionValueRequest $request, ProductVariant $variant): JsonResponse
    {
        $variant->optionValues()->syncWithoutDetaching(
            $request->validated()['option_value_ids']
        );

        return response()->json([
            'message' => 'Option value(s) attached successfully.',
            'data'    => $variant->fresh()->optionValues()->with('optionType')->get(),
        ], 201);
    }

    /**
     * PUT /api/variants/{variant}/option-values
     * Fully replace (sync) all option values on a variant.
     *
     * Payload: { "option_value_ids": ["uuid-1", "uuid-3"] }
     *
     * Any previously attached value NOT in this list will be detached.
     */
    public function update(UpdateProductVariantOptionValueRequest $request, ProductVariant $variant): JsonResponse
    {
        $variant->optionValues()->sync(
            $request->validated()['option_value_ids']
        );

        return response()->json([
            'message' => 'Option values synced successfully.',
            'data'    => $variant->fresh()->optionValues()->with('optionType')->get(),
        ]);
    }

    /**
     * DELETE /api/variants/{variant}/option-values/{optionValue}
     * Detach a single option value from a variant.
     *
     * e.g. remove "Red" from variant "TSHIRT-RED-XL"
     */
    public function destroy(ProductVariant $variant, ProductOptionValue $optionValue): JsonResponse
    {
        $variant->optionValues()->detach($optionValue->id);

        return response()->json([
            'message' => 'Option value detached from variant successfully.',
        ]);
    }
}
