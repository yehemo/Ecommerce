<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\OrderShipment>
 */
class OrderShipmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'carrier' => fake()->randomElement(['DHL', 'FedEx', 'UPS']),
            'tracking_number' => fake()->bothify('TRK-########'),
            'tracking_url' => fake()->url(),
            'status' => fake()->randomElement(['pending', 'shipped', 'delivered']),
            'shipped_at' => now()->subDay(),
            'delivered_at' => null,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
