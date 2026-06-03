<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::ADMIN,
        ]);
        User::factory()->create([
            'name' => 'Customer User',
            'email' => 'user@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::CUSTOMER,
        ]);
        User::factory(5)->create();

        $this->call([
            CategorySeeder::class,
        ]);
    }
}
