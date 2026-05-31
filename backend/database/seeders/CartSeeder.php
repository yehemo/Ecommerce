<?php

namespace Database\Seeders;

use App\Models\Cart;
use App\Models\User;
use Illuminate\Database\Seeder;

class CartSeeder extends Seeder
{
    public function run(): void
    {
        $customers = User::query()
            ->where('role', 'customer')
            ->take(5)
            ->get();

        foreach ($customers as $customer) {
            Cart::query()->firstOrCreate([
                'user_id' => $customer->id,
                'status' => 'active',
            ]);
        }
    }
}
