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
            'provider' => fake()->randomElement(['payway', 'manual']),
            'provider_reference' => 'PAY-'.Str::upper(fake()->unique()->bothify('##??##??')),
            'provider_status' => fake()->randomElement(['PENDING', 'APPROVED', null]),
            'provider_approval_code' => fake()->optional()->numerify('######'),
            'amount_minor' => fake()->numberBetween(2000, 40000),
            'currency' => 'USD',
            'status' => fake()->randomElement(['pending', 'paid', 'failed']),
            'qr_string' => null,
            'qr_image' => null,
            'deeplink' => null,
            'callback_payload' => null,
            'expires_at' => fake()->optional()->dateTimeBetween('-5 minutes', '+10 minutes'),
            'verified_at' => fake()->optional()->dateTimeBetween('-5 minutes', 'now'),
            'paid_at' => fake()->boolean(70) ? now() : null,
        ];
    }
}
