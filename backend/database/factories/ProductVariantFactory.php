<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => 'SKU-'.Str::upper(fake()->unique()->bothify('??###??')),
            'price_minor' => fake()->numberBetween(1500, 25000),
            'stock_qty' => fake()->numberBetween(0, 100),
            'status' => fake()->randomElement(['active', 'out_of_stock']),
        ];
    }
}
