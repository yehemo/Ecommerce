<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * GET /api/categories
     * List all categories with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::with(['parent', 'children'])
            ->when($request->boolean('root_only'), fn ($q) => $q->whereNull('parent_id'))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->search, fn ($q, $v) => $q->where('name', 'ilike', "%{$v}%"));

        $categories = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($categories);
    }

    /**
     * POST /api/categories
     * Create a new category.
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $category = Category::create([
            'parent_id' => $validated['parent_id'] ?? null,
            'name'      => $validated['name'],
            'slug'      => Str::slug($validated['name']) . '-' . time(),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Category created successfully.',
            'data'    => $category->load('parent', 'children'),
        ], 201);
    }

    /**
     * GET /api/categories/{category}
     * Show a single category with parent and children.
     */
    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'data' => $category->load('parent', 'children'),
        ]);
    }

    /**
     * PUT/PATCH /api/categories/{category}
     * Update a category.
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $validated = $request->validated();

        $category->update([
            'parent_id' => array_key_exists('parent_id', $validated)
                ? $validated['parent_id']
                : $category->parent_id,
            'name'      => $validated['name'] ?? $category->name,
            'slug'      => isset($validated['name'])
                ? Str::slug($validated['name']) . '-' . time()
                : $category->slug,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ]);

        return response()->json([
            'message' => 'Category updated successfully.',
            'data'    => $category->fresh()->load('parent', 'children'),
        ]);
    }

    /**
     * DELETE /api/categories/{category}
     * Delete a category (blocked if products are assigned).
     */
    public function destroy(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category: it still has products assigned to it.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ]);
    }
}
