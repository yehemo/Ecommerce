<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CartItemController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductOptionTypeController;
use App\Http\Controllers\Api\ProductOptionValueController;
use App\Http\Controllers\Api\ProductVariantController;
use App\Http\Controllers\Api\ProductVariantOptionValueController;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

// Cart routes (auth required)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartItemController::class, 'store']);
    Route::patch('/cart/items/{cartItem}', [CartItemController::class, 'update']);
    Route::delete('/cart/items/{cartItem}', [CartItemController::class, 'destroy']);
});

// Public read-only routes
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

Route::apiResource('option-types', ProductOptionTypeController::class)->only(['index', 'show']);
Route::apiResource('option-values', ProductOptionValueController::class)->only(['index', 'show']);
Route::apiResource('variants', ProductVariantController::class)->only(['index', 'show']);
Route::apiResource('variant-option-values', ProductVariantOptionValueController::class)->only(['index', 'show']);

// Admin-only write routes
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::match(['put', 'patch'], '/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::post('/products', [ProductController::class, 'store']);
    Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::apiResource('option-types', ProductOptionTypeController::class)->except(['index', 'show']);
    Route::apiResource('option-values', ProductOptionValueController::class)->except(['index', 'show']);
    Route::apiResource('variants', ProductVariantController::class)->except(['index', 'show']);
    Route::apiResource('variant-option-values', ProductVariantOptionValueController::class)->except(['index', 'show']);
});
