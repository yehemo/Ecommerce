<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductOptionTypeRequest;
use App\Http\Requests\UpdateProductOptionTypeRequest;
use App\Models\Product;
use App\Models\ProductOptionType;
use Illuminate\Http\JsonResponse;

class ProductOptionTypeController extends Controller
{
    /**
     * GET /api/products/{product}/option-types
     * List all option types for the given product.
     */
    public function index(Product $product): JsonResponse
    {
        $optionTypes = $product->optionTypes()->with('values')->get();

        return response()->json([
            'data' => $optionTypes,
        ]);
    }

    /**
     * POST /api/products/{product}/option-types
     * Create a new option type (e.g. "Material") for the given product.
     */
    public function store(StoreProductOptionTypeRequest $request, Product $product): JsonResponse
    {
        $optionType = $product->optionTypes()->create(
            $request->validated()
        );

        return response()->json([
            'message' => 'Option type created successfully.',
            'data'    => $optionType->load('values'),
        ], 201);
    }

    /**
     * PUT /api/option-types/{optionType}
     * Rename an existing option type.
     */
    public function update(UpdateProductOptionTypeRequest $request, ProductOptionType $optionType): JsonResponse
    {
        $optionType->update($request->validated());

        return response()->json([
            'message' => 'Option type updated successfully.',
            'data'    => $optionType->fresh()->load('values'),
        ]);
    }

    /**
     * DELETE /api/option-types/{optionType}
     * Delete an option type and cascade-delete its values.
     */
    public function destroy(ProductOptionType $optionType): JsonResponse
    {
        // Values are cascade-deleted at the DB level (or via the HasMany relation).
        $optionType->values()->delete();
        $optionType->delete();

        return response()->json([
            'message' => 'Option type and its values deleted successfully.',
        ]);
    }
}
