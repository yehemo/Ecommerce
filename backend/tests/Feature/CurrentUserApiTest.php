<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrentUserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_update_their_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'original@example.com',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/user', [
                'name' => 'Updated Name',
                'email' => 'updated@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.email', 'updated@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);
    }

    public function test_user_cannot_update_profile_with_another_users_email(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@example.com',
        ]);
        User::factory()->create([
            'email' => 'taken@example.com',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/user', [
                'name' => 'Owner',
                'email' => 'taken@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_guest_cannot_update_profile(): void
    {
        $this->patchJson('/api/user', [
            'name' => 'Guest',
            'email' => 'guest@example.com',
        ])->assertUnauthorized();
    }
}
