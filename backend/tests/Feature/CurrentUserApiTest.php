<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_authenticated_user_can_update_their_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('old-password'),
        ]);

        $this->actingAs($user)
            ->patchJson('/api/user/password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.');

        $user->refresh();

        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertFalse(Hash::check('old-password', $user->password));
    }

    public function test_user_cannot_update_password_with_incorrect_current_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('old-password'),
        ]);

        $this->actingAs($user)
            ->patchJson('/api/user/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_user_cannot_update_password_with_mismatched_confirmation(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('old-password'),
        ]);

        $this->actingAs($user)
            ->patchJson('/api/user/password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'different-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_guest_cannot_update_password(): void
    {
        $this->patchJson('/api/user/password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertUnauthorized();
    }
}
