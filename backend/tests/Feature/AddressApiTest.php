<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AddressApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_their_saved_addresses(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $address = Address::factory()->create([
            'user_id' => $user->id,
            'type' => 'shipping',
            'is_default' => true,
        ]);
        Address::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $this->actingAs($user)
            ->getJson('/api/addresses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $address->id);
    }

    public function test_authenticated_user_can_create_a_saved_address(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/addresses', $this->addressPayload())
            ->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.type', 'shipping')
            ->assertJsonPath('data.city', 'Austin');

        $this->assertDatabaseHas('addresses', [
            'user_id' => $user->id,
            'type' => 'shipping',
            'full_name' => 'Jane Shopper',
            'postal_code' => '78701',
        ]);
    }

    public function test_setting_new_default_address_unsets_existing_default_for_same_type(): void
    {
        $user = User::factory()->create();
        $existing = Address::factory()->create([
            'user_id' => $user->id,
            'type' => 'shipping',
            'is_default' => true,
        ]);

        $this->actingAs($user)
            ->postJson('/api/addresses', [
                ...$this->addressPayload(),
                'is_default' => true,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('addresses', [
            'id' => $existing->id,
            'is_default' => false,
        ]);
    }

    public function test_user_can_update_their_saved_address(): void
    {
        $user = User::factory()->create();
        $address = Address::factory()->create([
            'user_id' => $user->id,
            'type' => 'shipping',
            'is_default' => false,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/addresses/{$address->id}", [
                'full_name' => 'Updated Shopper',
                'type' => 'billing',
                'is_default' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.full_name', 'Updated Shopper')
            ->assertJsonPath('data.type', 'billing')
            ->assertJsonPath('data.is_default', true);
    }

    public function test_user_cannot_update_another_users_saved_address(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $address = Address::factory()->create([
            'user_id' => $owner->id,
        ]);

        $this->actingAs($otherUser)
            ->patchJson("/api/addresses/{$address->id}", [
                'full_name' => 'Nope',
            ])
            ->assertForbidden();
    }

    public function test_user_can_delete_their_saved_address(): void
    {
        $user = User::factory()->create();
        $address = Address::factory()->create([
            'user_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/addresses/{$address->id}")
            ->assertOk();

        $this->assertDatabaseMissing('addresses', [
            'id' => $address->id,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function addressPayload(): array
    {
        return [
            'type' => 'shipping',
            'full_name' => 'Jane Shopper',
            'phone' => '5551234567',
            'line_1' => '123 Market Street',
            'line_2' => null,
            'city' => 'Austin',
            'postal_code' => '78701',
            'is_default' => false,
        ];
    }
}
