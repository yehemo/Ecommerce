<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = ['Women', 'Men', 'Kids', 'New Arrivals'];

        foreach ($categories as $category) {
            $slug = Str::slug($category);

            Category::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $category,
                    'is_active' => true,
                ]
            );
        }
    }
}
