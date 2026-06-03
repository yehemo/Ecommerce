<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    /**
     * POST /api/upload-image
     * Upload an image file and return its public URL.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120', 'mimes:jpeg,jpg,png,webp,gif'],
        ]);

        $file = $request->file('image');
        $path = $file->store('product-images', 'public');

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'url' => $url,
        ], 201);
    }
}
