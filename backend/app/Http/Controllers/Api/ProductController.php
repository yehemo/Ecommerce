<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * List all products with pagination and optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'variants', 'optionTypes.values', 'images'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->category_id, fn ($q, $v) => $q->where('category_id', $v))
            ->when($request->search, fn ($q, $v) => $q->where('name', 'ilike', "%{$v}%"));

        $products = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($products);
    }

    /**
     * POST /api/products
     * Create a product with option types, values, and variants.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $product = DB::transaction(function () use ($validated) {
            $product = Product::create([
                'category_id' => $validated['category_id'],
                'name'        => $validated['name'],
                'slug'        => Str::slug($validated['name']) . '-' . time(),
                'description' => $validated['description'] ?? null,
                'status'      => $validated['status'] ?? 'active',
            ]);

            $optionMap = [];

            if (!empty($validated['options'])) {
                foreach ($validated['options'] as $option) {
                    $optionType = $product->optionTypes()->create(['name' => $option['name']]);
                    foreach ($option['values'] as $value) {
                        $created = $optionType->values()->create(['value' => $value]);
                        $optionMap[$option['name']][$value] = $created->id;
                    }
                }
            }

            foreach ($validated['variants'] as $variantData) {
                $variant = $product->variants()->create([
                    'sku'         => $variantData['sku'],
                    'price_minor' => $variantData['price_minor'],
                    'stock_qty'   => $variantData['stock_qty'],
                    'status'      => 'active',
                ]);

                if (!empty($variantData['options'])) {
                    $ids = [];
                    foreach ($variantData['options'] as $optName => $optVal) {
                        if (isset($optionMap[$optName][$optVal])) {
                            $ids[] = $optionMap[$optName][$optVal];
                        }
                    }
                    if ($ids) {
                        $variant->optionValues()->attach($ids);
                    }
                }
            }

            return $product->load('category', 'variants.optionValues', 'optionTypes.values');
        });

        return response()->json([
            'message' => 'Product created successfully.',
            'data'    => $product,
        ], 201);
    }

    /**
     * GET /api/products/{product}
     */
    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'data' => $product->load('category', 'variants.optionValues', 'optionTypes.values', 'images'),
        ]);
    }

    /**
     * PUT/PATCH /api/products/{product}
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        $product->update([
            'category_id' => $validated['category_id'] ?? $product->category_id,
            'name'        => $validated['name']        ?? $product->name,
            'slug'        => isset($validated['name'])
                                ? Str::slug($validated['name']) . '-' . time()
                                : $product->slug,
            'description' => $validated['description'] ?? $product->description,
            'status'      => $validated['status']      ?? $product->status,
        ]);

        return response()->json([
            'message' => 'Product updated successfully.',
            'data'    => $product->fresh()->load('category', 'variants.optionValues', 'optionTypes.values'),
        ]);
    }

    /**
     * DELETE /api/products/{product}
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully.']);
    }
}
