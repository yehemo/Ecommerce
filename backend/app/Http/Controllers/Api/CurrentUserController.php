<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCurrentUserRequest;
use Illuminate\Http\JsonResponse;

class CurrentUserController extends Controller
{
    public function update(UpdateCurrentUserRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update($request->validated());

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => $user->fresh(),
        ]);
    }
}
