<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
            ->when($request->category_name, function ($q, $v) {
                $q->whereHas('category', fn ($q2) => $q2->whereRaw('LOWER(name) = ?', [strtolower($v)]));
            })
            ->when($request->boolean('is_new_arrival'), fn ($q) => $q->where('is_new_arrival', true))
            ->when($request->search, fn ($q, $v) => $q->where('name', 'ilike', "%{$v}%"));

        // Filter by size/color (requires variants linked to option values)
        if ($request->has('sizes') || $request->has('colors')) {
            $query->whereHas('variants.optionValues', function ($q) use ($request) {
                if ($request->has('sizes')) {
                    $sizes = is_array($request->sizes) ? $request->sizes : explode(',', $request->sizes);
                    $q->whereIn('value', $sizes);
                }
                if ($request->has('colors')) {
                    $colors = is_array($request->colors) ? $request->colors : explode(',', $request->colors);
                    $q->whereIn('value', $colors);
                }
            });
        }

        // Filter by price range
        if ($request->filled('min_price') || $request->filled('max_price')) {
            $query->whereHas('variants', function ($q) use ($request) {
                if ($request->filled('min_price')) {
                    $q->where('price_minor', '>=', $request->integer('min_price'));
                }
                if ($request->filled('max_price')) {
                    $q->where('price_minor', '<=', $request->integer('max_price'));
                }
            });
        }

        // Sorting
        $sort = $request->input('sort', 'newest');
        switch ($sort) {
            case 'price_asc':
                $query->withMin('variants', 'price_minor')->orderBy('variants_min_price_minor', 'asc');
                break;
            case 'price_desc':
                $query->withMax('variants', 'price_minor')->orderBy('variants_max_price_minor', 'desc');
                break;
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'newest':
            default:
                $query->latest();
                break;
        }

        $products = $query->paginate($request->integer('per_page', 15));

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
                'category_id'    => $validated['category_id'],
                'name'           => $validated['name'],
                'slug'           => Str::slug($validated['name']) . '-' . time(),
                'description'    => $validated['description'] ?? null,
                'status'         => $validated['status'] ?? 'active',
                'is_new_arrival' => $validated['is_new_arrival'] ?? false,
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
                    'status'      => $variantData['status'] ?? 'active',
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

            if (!empty($validated['images'])) {
                $product->images()->createMany(
                    collect($validated['images'])->map(fn (array $image) => [
                        'image_url' => $image['image_url'],
                        'sort_order' => $image['sort_order'] ?? 0,
                        'variant_id' => null,
                    ])->all()
                );
            }

            return $product->load('category', 'variants.optionValues', 'optionTypes.values', 'images');
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
            'data' => $product->load('category', 'variants.optionValues.optionType', 'optionTypes.values', 'images'),
        ]);
    }

    /**
     * PUT/PATCH /api/products/{product}
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        $product = DB::transaction(function () use ($product, $validated) {
            $product->update([
                'category_id'    => $validated['category_id'] ?? $product->category_id,
                'name'           => $validated['name']        ?? $product->name,
                'slug'           => isset($validated['name'])
                    ? Str::slug($validated['name']) . '-' . time()
                    : $product->slug,
                'description'    => $validated['description'] ?? $product->description,
                'status'         => $validated['status']      ?? $product->status,
                'is_new_arrival' => $validated['is_new_arrival'] ?? $product->is_new_arrival,
            ]);

            $optionMap = [];

            if (array_key_exists('options', $validated)) {
                $product->optionTypes()->delete();

                foreach ($validated['options'] as $option) {
                    $optionType = $product->optionTypes()->create(['name' => $option['name']]);

                    foreach ($option['values'] as $value) {
                        $created = $optionType->values()->create(['value' => $value]);
                        $optionMap[$option['name']][$value] = $created->id;
                    }
                }
            }

            if (!empty($validated['variants'])) {
                $existingVariants = $product->variants()->get()->keyBy('id');
                $submittedVariantIds = [];

                foreach ($validated['variants'] as $index => $variantData) {
                    $variantId = $variantData['id'] ?? null;

                    $skuOwner = ProductVariant::query()
                        ->where('sku', $variantData['sku'])
                        ->when($variantId, fn ($query) => $query->where('id', '!=', $variantId))
                        ->exists();

                    if ($skuOwner) {
                        throw ValidationException::withMessages([
                            "variants.{$index}.sku" => ['The SKU has already been taken.'],
                        ]);
                    }

                    if ($variantId) {
                        $variant = $existingVariants->get($variantId);

                        if (!$variant) {
                            throw ValidationException::withMessages([
                                "variants.{$index}.id" => ['The selected variant does not belong to this product.'],
                            ]);
                        }

                        $variant->update([
                            'sku' => $variantData['sku'],
                            'price_minor' => $variantData['price_minor'],
                            'stock_qty' => $variantData['stock_qty'],
                            'status' => $variantData['status'] ?? $variant->status,
                        ]);

                        $submittedVariantIds[] = $variant->id;

                        if (array_key_exists('options', $validated)) {
                            $variant->optionValues()->sync(
                                $this->mapVariantOptionIds($variantData['options'] ?? [], $optionMap)
                            );
                        }

                        continue;
                    }

                    $variant = $product->variants()->create([
                        'sku' => $variantData['sku'],
                        'price_minor' => $variantData['price_minor'],
                        'stock_qty' => $variantData['stock_qty'],
                        'status' => $variantData['status'] ?? 'active',
                    ]);

                    $submittedVariantIds[] = $variant->id;

                    if (array_key_exists('options', $validated)) {
                        $variant->optionValues()->sync(
                            $this->mapVariantOptionIds($variantData['options'] ?? [], $optionMap)
                        );
                    }
                }

                $product->variants()
                    ->whereNotIn('id', $submittedVariantIds)
                    ->delete();
            }

            if (array_key_exists('images', $validated)) {
                $product->images()->delete();

                if (!empty($validated['images'])) {
                    $product->images()->createMany(
                        collect($validated['images'])->map(fn (array $image) => [
                            'image_url' => $image['image_url'],
                            'sort_order' => $image['sort_order'] ?? 0,
                            'variant_id' => null,
                        ])->all()
                    );
                }
            }

            return $product->fresh()->load('category', 'variants.optionValues.optionType', 'optionTypes.values', 'images');
        });

        return response()->json([
            'message' => 'Product updated successfully.',
            'data'    => $product,
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

    /**
     * @param  array<string, string>  $selectedOptions
     * @param  array<string, array<string, string>>  $optionMap
     * @return list<string>
     */
    private function mapVariantOptionIds(array $selectedOptions, array $optionMap): array
    {
        $ids = [];

        foreach ($selectedOptions as $optionName => $optionValue) {
            if (isset($optionMap[$optionName][$optionValue])) {
                $ids[] = $optionMap[$optionName][$optionValue];
            }
        }

        return $ids;
    }
}
