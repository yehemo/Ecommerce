<?php

namespace Database\Factories;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryMovement>
 */
class InventoryMovementFactory extends Factory
{
    public function definition(): array
    {
        $before = fake()->numberBetween(1, 20);
        $delta = fake()->randomElement([-5, -3, -1, 1, 3, 5]);
        $after = max($before + $delta, 0);

        return [
            'product_variant_id' => ProductVariant::factory(),
            'actor_user_id' => null,
            'order_id' => null,
            'reason' => fake()->randomElement([
                'manual_adjustment',
                'restock',
                'damage',
                'correction',
                'checkout_reservation',
                'cancellation_restore',
            ]),
            'quantity_delta' => $after === 0 && $before + $delta < 0 ? -$before : $delta,
            'quantity_before' => $before,
            'quantity_after' => $after,
        ];
    }
}
