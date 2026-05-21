<?php

namespace Database\Factories;

use App\Models\ProductOptionValue;
use App\Models\ProductOptionType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductOptionValue>
 */
class ProductOptionValueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'option_type_id' => ProductOptionType::factory(),
            'value' => fake()->randomElement(['S', 'M', 'L', 'Red', 'Blue', 'Black']),
        ];
    }
}
