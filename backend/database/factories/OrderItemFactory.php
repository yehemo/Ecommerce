<?php

namespace Database\Factories;

use App\Models\OrderItem;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $unitPrice = fake()->numberBetween(1500, 25000);
        $quantity = fake()->numberBetween(1, 4);

        return [
            'order_id' => Order::factory(),
            'product_id' => null,
            'product_variant_id' => null,
            'product_name' => fake()->words(3, true),
            'sku' => 'SKU-'.Str::upper(fake()->bothify('??###??')),
            'unit_price_minor' => $unitPrice,
            'quantity' => $quantity,
            'line_total_minor' => $unitPrice * $quantity,
        ];
    }
}
