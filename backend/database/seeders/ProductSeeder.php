<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductOptionType;
use App\Models\ProductOptionValue;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::query()
            ->whereIn('name', ['Women', 'Men', 'Kids', 'New Arrivals'])
            ->get()
            ->keyBy('name');

        foreach ($this->catalog() as $categoryName => $products) {
            $category = $categories->get($categoryName);

            if (! $category) {
                continue;
            }

            foreach ($products as $productData) {
                $this->seedProduct($category, $productData);
            }
        }
    }

    /**
     * @param  array{
     *   name: string,
     *   description: string,
     *   status?: string,
     *   is_new_arrival?: bool,
     *   images?: list<string>,
     *   options?: array<string, list<string>>,
     *   variants: list<array{
     *     price_minor: int,
     *     stock_qty: int,
     *     status?: string,
     *     options?: array<string, string>
     *   }>
     * }  $productData
     */
    private function seedProduct(Category $category, array $productData): void
    {
        DB::transaction(function () use ($category, $productData): void {
            $slug = Str::slug($productData['name']);

            $product = Product::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $category->id,
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'status' => $productData['status'] ?? 'active',
                    'is_new_arrival' => $productData['is_new_arrival'] ?? $category->name === 'New Arrivals',
                ]
            );

            $product->images()->delete();
            $product->variants()->delete();
            $product->optionTypes()->delete();

            $optionValueIds = collect();

            foreach ($productData['options'] ?? [] as $optionName => $values) {
                $optionType = ProductOptionType::query()->create([
                    'product_id' => $product->id,
                    'name' => $optionName,
                ]);

                foreach ($values as $value) {
                    $optionValue = ProductOptionValue::query()->create([
                        'option_type_id' => $optionType->id,
                        'value' => $value,
                    ]);

                    $optionValueIds->put($optionName . ':' . $value, $optionValue->id);
                }
            }

            foreach ($productData['variants'] as $index => $variantData) {
                $variant = ProductVariant::query()->create([
                    'product_id' => $product->id,
                    'sku' => $this->buildSku($product->name, $variantData['options'] ?? [], $index),
                    'price_minor' => $variantData['price_minor'],
                    'stock_qty' => $variantData['stock_qty'],
                    'status' => $variantData['status'] ?? 'active',
                ]);

                $selectedOptionIds = collect($variantData['options'] ?? [])
                    ->map(fn (string $value, string $name) => $optionValueIds->get($name . ':' . $value))
                    ->filter()
                    ->values()
                    ->all();

                if ($selectedOptionIds !== []) {
                    $variant->optionValues()->attach($selectedOptionIds);
                }
            }

            foreach ($productData['images'] ?? [] as $index => $imageUrl) {
                ProductImage::query()->create([
                    'product_id' => $product->id,
                    'variant_id' => null,
                    'image_url' => $imageUrl,
                    'sort_order' => $index,
                ]);
            }
        });
    }

    /**
     * @param  array<string, string>  $options
     */
    private function buildSku(string $productName, array $options, int $index): string
    {
        $parts = [Str::upper(Str::slug($productName, '-'))];

        foreach ($options as $value) {
            $parts[] = Str::upper(Str::slug($value, '-'));
        }

        $parts[] = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

        return implode('-', $parts);
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function catalog(): array
    {
        return [
            'Women' => [
                [
                    'name' => 'Linen Wrap Dress',
                    'description' => 'A lightweight wrap dress with a clean waist tie and easy drape for everyday wear.',
                    'images' => $this->imageSet('women-linen-wrap-dress'),
                    'options' => [
                        'Color' => ['Sand', 'Olive'],
                        'Size' => ['S', 'M', 'L'],
                    ],
                    'variants' => [
                        ['price_minor' => 8900, 'stock_qty' => 8, 'options' => ['Color' => 'Sand', 'Size' => 'S']],
                        ['price_minor' => 8900, 'stock_qty' => 10, 'options' => ['Color' => 'Sand', 'Size' => 'M']],
                        ['price_minor' => 8900, 'stock_qty' => 7, 'options' => ['Color' => 'Sand', 'Size' => 'L']],
                        ['price_minor' => 9200, 'stock_qty' => 6, 'options' => ['Color' => 'Olive', 'Size' => 'S']],
                        ['price_minor' => 9200, 'stock_qty' => 9, 'options' => ['Color' => 'Olive', 'Size' => 'M']],
                        ['price_minor' => 9200, 'stock_qty' => 5, 'options' => ['Color' => 'Olive', 'Size' => 'L']],
                    ],
                ],
                [
                    'name' => 'Tailored Cropped Blazer',
                    'description' => 'Sharp cropped blazer with a relaxed shoulder and polished interior finishing.',
                    'images' => $this->imageSet('women-cropped-blazer'),
                    'options' => [
                        'Color' => ['Black', 'Stone'],
                        'Size' => ['S', 'M', 'L'],
                    ],
                    'variants' => [
                        ['price_minor' => 12900, 'stock_qty' => 4, 'options' => ['Color' => 'Black', 'Size' => 'S']],
                        ['price_minor' => 12900, 'stock_qty' => 6, 'options' => ['Color' => 'Black', 'Size' => 'M']],
                        ['price_minor' => 12900, 'stock_qty' => 3, 'options' => ['Color' => 'Black', 'Size' => 'L']],
                        ['price_minor' => 12500, 'stock_qty' => 5, 'options' => ['Color' => 'Stone', 'Size' => 'S']],
                        ['price_minor' => 12500, 'stock_qty' => 4, 'options' => ['Color' => 'Stone', 'Size' => 'M']],
                        ['price_minor' => 12500, 'stock_qty' => 2, 'options' => ['Color' => 'Stone', 'Size' => 'L']],
                    ],
                ],
            ],
            'Men' => [
                [
                    'name' => 'Relaxed Oxford Shirt',
                    'description' => 'Soft oxford cotton shirt with a relaxed profile and clean collar roll.',
                    'images' => $this->imageSet('men-relaxed-oxford-shirt'),
                    'options' => [
                        'Color' => ['White', 'Sky'],
                        'Size' => ['M', 'L', 'XL'],
                    ],
                    'variants' => [
                        ['price_minor' => 7600, 'stock_qty' => 12, 'options' => ['Color' => 'White', 'Size' => 'M']],
                        ['price_minor' => 7600, 'stock_qty' => 11, 'options' => ['Color' => 'White', 'Size' => 'L']],
                        ['price_minor' => 7600, 'stock_qty' => 8, 'options' => ['Color' => 'White', 'Size' => 'XL']],
                        ['price_minor' => 7900, 'stock_qty' => 9, 'options' => ['Color' => 'Sky', 'Size' => 'M']],
                        ['price_minor' => 7900, 'stock_qty' => 7, 'options' => ['Color' => 'Sky', 'Size' => 'L']],
                        ['price_minor' => 7900, 'stock_qty' => 6, 'options' => ['Color' => 'Sky', 'Size' => 'XL']],
                    ],
                ],
                [
                    'name' => 'Utility Overshirt',
                    'description' => 'Mid-weight overshirt with patch pockets and an easy layering fit.',
                    'images' => $this->imageSet('men-utility-overshirt'),
                    'options' => [
                        'Color' => ['Charcoal', 'Khaki'],
                        'Size' => ['M', 'L', 'XL'],
                    ],
                    'variants' => [
                        ['price_minor' => 9800, 'stock_qty' => 5, 'options' => ['Color' => 'Charcoal', 'Size' => 'M']],
                        ['price_minor' => 9800, 'stock_qty' => 7, 'options' => ['Color' => 'Charcoal', 'Size' => 'L']],
                        ['price_minor' => 9800, 'stock_qty' => 4, 'options' => ['Color' => 'Charcoal', 'Size' => 'XL']],
                        ['price_minor' => 9600, 'stock_qty' => 6, 'options' => ['Color' => 'Khaki', 'Size' => 'M']],
                        ['price_minor' => 9600, 'stock_qty' => 5, 'options' => ['Color' => 'Khaki', 'Size' => 'L']],
                        ['price_minor' => 9600, 'stock_qty' => 3, 'options' => ['Color' => 'Khaki', 'Size' => 'XL']],
                    ],
                ],
            ],
            'Kids' => [
                [
                    'name' => 'Playground Hoodie Set',
                    'description' => 'Matching hoodie and jogger set built for movement, layering, and easy washing.',
                    'images' => $this->imageSet('kids-playground-hoodie-set'),
                    'options' => [
                        'Color' => ['Navy', 'Mint'],
                        'Size' => ['4Y', '6Y', '8Y'],
                    ],
                    'variants' => [
                        ['price_minor' => 5400, 'stock_qty' => 10, 'options' => ['Color' => 'Navy', 'Size' => '4Y']],
                        ['price_minor' => 5400, 'stock_qty' => 9, 'options' => ['Color' => 'Navy', 'Size' => '6Y']],
                        ['price_minor' => 5400, 'stock_qty' => 6, 'options' => ['Color' => 'Navy', 'Size' => '8Y']],
                        ['price_minor' => 5600, 'stock_qty' => 7, 'options' => ['Color' => 'Mint', 'Size' => '4Y']],
                        ['price_minor' => 5600, 'stock_qty' => 8, 'options' => ['Color' => 'Mint', 'Size' => '6Y']],
                        ['price_minor' => 5600, 'stock_qty' => 5, 'options' => ['Color' => 'Mint', 'Size' => '8Y']],
                    ],
                ],
                [
                    'name' => 'Weekend Graphic Tee',
                    'description' => 'Soft jersey tee with a clean graphic front and durable ribbed neckline.',
                    'images' => $this->imageSet('kids-weekend-graphic-tee'),
                    'options' => [
                        'Color' => ['Cream', 'Blue'],
                        'Size' => ['4Y', '6Y', '8Y'],
                    ],
                    'variants' => [
                        ['price_minor' => 2800, 'stock_qty' => 14, 'options' => ['Color' => 'Cream', 'Size' => '4Y']],
                        ['price_minor' => 2800, 'stock_qty' => 12, 'options' => ['Color' => 'Cream', 'Size' => '6Y']],
                        ['price_minor' => 2800, 'stock_qty' => 10, 'options' => ['Color' => 'Cream', 'Size' => '8Y']],
                        ['price_minor' => 2900, 'stock_qty' => 11, 'options' => ['Color' => 'Blue', 'Size' => '4Y']],
                        ['price_minor' => 2900, 'stock_qty' => 10, 'options' => ['Color' => 'Blue', 'Size' => '6Y']],
                        ['price_minor' => 2900, 'stock_qty' => 8, 'options' => ['Color' => 'Blue', 'Size' => '8Y']],
                    ],
                ],
            ],
            'New Arrivals' => [
                [
                    'name' => 'Studio Zip Jacket',
                    'description' => 'A fresh season zip jacket with a compact shell, high collar, and crisp finish.',
                    'is_new_arrival' => true,
                    'images' => $this->imageSet('new-arrivals-studio-zip-jacket'),
                    'options' => [
                        'Color' => ['Ink', 'Clay'],
                        'Size' => ['S', 'M', 'L'],
                    ],
                    'variants' => [
                        ['price_minor' => 11500, 'stock_qty' => 5, 'options' => ['Color' => 'Ink', 'Size' => 'S']],
                        ['price_minor' => 11500, 'stock_qty' => 7, 'options' => ['Color' => 'Ink', 'Size' => 'M']],
                        ['price_minor' => 11500, 'stock_qty' => 4, 'options' => ['Color' => 'Ink', 'Size' => 'L']],
                        ['price_minor' => 11800, 'stock_qty' => 4, 'options' => ['Color' => 'Clay', 'Size' => 'S']],
                        ['price_minor' => 11800, 'stock_qty' => 6, 'options' => ['Color' => 'Clay', 'Size' => 'M']],
                        ['price_minor' => 11800, 'stock_qty' => 4, 'options' => ['Color' => 'Clay', 'Size' => 'L']],
                    ],
                ],
                [
                    'name' => 'Rib Tank and Trouser Set',
                    'description' => 'New season coordinated set pairing a rib tank with relaxed straight trousers.',
                    'is_new_arrival' => true,
                    'images' => $this->imageSet('new-arrivals-rib-tank-set'),
                    'options' => [
                        'Color' => ['Ivory', 'Mocha'],
                        'Size' => ['S', 'M', 'L'],
                    ],
                    'variants' => [
                        ['price_minor' => 9900, 'stock_qty' => 6, 'options' => ['Color' => 'Ivory', 'Size' => 'S']],
                        ['price_minor' => 9900, 'stock_qty' => 8, 'options' => ['Color' => 'Ivory', 'Size' => 'M']],
                        ['price_minor' => 9900, 'stock_qty' => 5, 'options' => ['Color' => 'Ivory', 'Size' => 'L']],
                        ['price_minor' => 10200, 'stock_qty' => 5, 'options' => ['Color' => 'Mocha', 'Size' => 'S']],
                        ['price_minor' => 10200, 'stock_qty' => 7, 'options' => ['Color' => 'Mocha', 'Size' => 'M']],
                        ['price_minor' => 10200, 'stock_qty' => 4, 'options' => ['Color' => 'Mocha', 'Size' => 'L']],
                    ],
                ],
            ],
        ];
    }

    /**
     * @return list<string>
     */
    private function imageSet(string $seed): array
    {
        return [
            "https://picsum.photos/seed/{$seed}-1/900/1200",
            "https://picsum.photos/seed/{$seed}-2/900/1200",
        ];
    }
}
