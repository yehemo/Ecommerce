<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(2000, 40000);
        $discount = fake()->numberBetween(0, 1500);
        $tax = fake()->numberBetween(0, 2500);
        $shipping = fake()->numberBetween(0, 1200);

        return [
            'user_id' => User::factory(),
            'order_number' => 'ORD-'.Str::upper(fake()->unique()->bothify('##??##??')),
            'status' => fake()->randomElement(['pending', 'paid', 'processing']),
            'payment_status' => fake()->randomElement(['unpaid', 'paid']),
            'currency' => 'USD',
            'subtotal_minor' => $subtotal,
            'discount_minor' => $discount,
            'tax_minor' => $tax,
            'shipping_fee_minor' => $shipping,
            'total_minor' => max($subtotal - $discount + $tax + $shipping, 0),
            'placed_at' => now(),
        ];
    }
}
