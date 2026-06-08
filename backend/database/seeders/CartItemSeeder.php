<?php

namespace Database\Seeders;

use App\Models\Cart;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

class CartItemSeeder extends Seeder
{
    public function run(): void
    {
        $variants = ProductVariant::query()
            ->where('stock_qty', '>', 0)
            ->get();

        if ($variants->isEmpty()) {
            $variants = ProductVariant::factory()->count(20)->create([
                'stock_qty' => fake()->numberBetween(1, 25),
                'status' => 'active',
            ]);
        }

        Cart::query()
            ->where('status', 'active')
            ->get()
            ->each(function (Cart $cart) use ($variants): void {
                $selectedVariants = $variants->random(min(3, $variants->count()));

                foreach ($selectedVariants as $variant) {
                    $quantity = min(fake()->numberBetween(1, 3), max($variant->stock_qty, 1));

                    $cart->items()->updateOrCreate(
                        ['product_variant_id' => $variant->id],
                        [
                            'quantity' => $quantity,
                            'unit_price_minor' => $variant->price_minor,
                        ]
                    );
                }
            });
    }
}
