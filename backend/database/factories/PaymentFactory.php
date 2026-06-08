<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'provider' => fake()->randomElement(['stripe', 'paypal']),
            'provider_reference' => 'PAY-'.Str::upper(fake()->unique()->bothify('##??##??')),
            'amount_minor' => fake()->numberBetween(2000, 40000),
            'currency' => 'USD',
            'status' => fake()->randomElement(['pending', 'paid', 'failed']),
            'paid_at' => fake()->boolean(70) ? now() : null,
        ];
    }
}
