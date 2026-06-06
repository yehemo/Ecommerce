<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAddressRequest;
use App\Http\Requests\UpdateAddressRequest;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = Address::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->latest()
            ->get();

        return response()->json([
            'data' => $addresses,
        ]);
    }

    public function store(StoreAddressRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $address = DB::transaction(function () use ($request, $validated) {
            if (($validated['is_default'] ?? false) === true) {
                Address::query()
                    ->where('user_id', $request->user()->id)
                    ->where('type', $validated['type'])
                    ->update(['is_default' => false]);
            }

            return Address::query()->create([
                ...$validated,
                'user_id' => $request->user()->id,
                'is_default' => $validated['is_default'] ?? false,
            ]);
        });

        return response()->json([
            'message' => 'Address saved successfully.',
            'data' => $address,
        ], 201);
    }

    public function update(UpdateAddressRequest $request, Address $address): JsonResponse
    {
        $this->authorize('update', $address);

        $validated = $request->validated();

        DB::transaction(function () use ($request, $address, $validated) {
            $type = $validated['type'] ?? $address->type;
            $isDefault = $validated['is_default'] ?? $address->is_default;

            if ($isDefault === true) {
                Address::query()
                    ->where('user_id', $request->user()->id)
                    ->where('type', $type)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }

            $address->update([
                ...$validated,
                'type' => $type,
                'is_default' => $isDefault,
            ]);
        });

        return response()->json([
            'message' => 'Address updated successfully.',
            'data' => $address->fresh(),
        ]);
    }

    public function destroy(Address $address): JsonResponse
    {
        $this->authorize('delete', $address);

        $address->delete();

        return response()->json([
            'message' => 'Address removed successfully.',
        ]);
    }
}
