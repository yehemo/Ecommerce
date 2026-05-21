<?php

namespace Database\Factories;

use App\Models\ProductVariantOptionValue;
use App\Models\ProductOptionValue;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariantOptionValue>
 */
class ProductVariantOptionValueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_variant_id' => ProductVariant::factory(),
            'option_value_id' => ProductOptionValue::factory(),
        ];
    }
}
