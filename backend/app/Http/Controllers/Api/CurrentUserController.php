<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCurrentUserRequest;
use App\Http\Requests\UpdateCurrentUserPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

    public function updatePassword(UpdateCurrentUserPasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->forceFill([
            'password' => Hash::make($request->string('password')),
            'remember_token' => Str::random(60),
        ])->save();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
