<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CartItemController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderAddressController;
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
    Route::post('/checkout', [CheckoutController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/pay', [OrderController::class, 'pay']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::patch('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
    Route::patch('/orders/{order}/addresses', [OrderAddressController::class, 'update']);
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
    Route::get('/admin/orders', [AdminOrderController::class, 'index']);
    Route::get('/admin/orders/{order}', [AdminOrderController::class, 'show']);
    Route::patch('/admin/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
    Route::patch('/admin/orders/{order}/shipment', [AdminOrderController::class, 'updateShipment']);
    Route::patch('/admin/orders/{order}/addresses', [AdminOrderController::class, 'updateAddresses']);

    Route::post('/categories', [CategoryController::class, 'store']);
    Route::match(['put', 'patch'], '/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::post('/products', [ProductController::class, 'store']);
    Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::post('/upload-image', [ImageUploadController::class, 'store']);

    Route::apiResource('option-types', ProductOptionTypeController::class)->except(['index', 'show']);
    Route::apiResource('option-values', ProductOptionValueController::class)->except(['index', 'show']);
    Route::apiResource('variants', ProductVariantController::class)->except(['index', 'show']);
    Route::apiResource('variant-option-values', ProductVariantOptionValueController::class)->except(['index', 'show']);
});
