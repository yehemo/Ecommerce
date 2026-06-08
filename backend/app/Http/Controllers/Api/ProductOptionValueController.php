<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductOptionValueRequest;
use App\Http\Requests\UpdateProductOptionValueRequest;
use App\Models\ProductOptionType;
use App\Models\ProductOptionValue;
use Illuminate\Http\JsonResponse;

class ProductOptionValueController extends Controller
{
    /**
     * GET /api/option-types/{optionType}/values
     * List all values for a specific option type.
     */
    public function index(ProductOptionType $optionType): JsonResponse
    {
        return response()->json([
            'data' => $optionType->values()->get(),
        ]);
    }

    /**
     * POST /api/option-types/{optionType}/values
     * Add a new value (e.g. "XL") to an option type (e.g. "Size").
     */
    public function store(StoreProductOptionValueRequest $request, ProductOptionType $optionType): JsonResponse
    {
        $value = $optionType->values()->create($request->validated());

        return response()->json([
            'message' => 'Option value created successfully.',
            'data'    => $value,
        ], 201);
    }

    /**
     * PUT /api/option-values/{optionValue}
     * Rename a specific option value (e.g. "Xl" -> "XL").
     */
    public function update(UpdateProductOptionValueRequest $request, ProductOptionValue $optionValue): JsonResponse
    {
        $optionValue->update($request->validated());

        return response()->json([
            'message' => 'Option value updated successfully.',
            'data'    => $optionValue->fresh(),
        ]);
    }

    /**
     * DELETE /api/option-values/{optionValue}
     * Delete a specific option value.
     * Note: removes it from any variant pivot rows as well.
     */
    public function destroy(ProductOptionValue $optionValue): JsonResponse
    {
        // Detach from all variants first (pivot: product_variant_option_values)
        $optionValue->variants()->detach();
        $optionValue->delete();

        return response()->json([
            'message' => 'Option value deleted successfully.',
        ]);
    }
}
