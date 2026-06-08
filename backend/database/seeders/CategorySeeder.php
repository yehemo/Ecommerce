<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = ['Women', 'Men', 'Kids', 'New Arrivals'];

        foreach ($categories as $category) {
            Category::query()->firstOrCreate(['name' => $category]);
        }
    }
}
