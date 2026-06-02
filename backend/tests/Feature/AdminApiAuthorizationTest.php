<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_product_and_category_reads_remain_available(): void
    {
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
        ]);

        $this->getJson('/api/products')->assertOk();
        $this->getJson("/api/products/{$product->id}")->assertOk();
        $this->getJson('/api/categories')->assertOk();
        $this->getJson("/api/categories/{$category->id}")->assertOk();
    }

    public function test_guest_cannot_create_a_product(): void
    {
        $category = Category::factory()->create();

        $this->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'Admin Only Product',
            'status' => 'active',
            'variants' => [
                [
                    'sku' => 'SKU-ADMIN001',
                    'price_minor' => 1999,
                    'stock_qty' => 5,
                ],
            ],
        ])->assertUnauthorized();
    }

    public function test_customer_cannot_create_update_or_delete_a_product(): void
    {
        $customer = User::factory()->create();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
        ]);

        $this->actingAs($customer)->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'Blocked Product',
            'status' => 'active',
            'variants' => [
                [
                    'sku' => 'SKU-BLOCK001',
                    'price_minor' => 2499,
                    'stock_qty' => 5,
                ],
            ],
        ])->assertForbidden();

        $this->actingAs($customer)->patchJson("/api/products/{$product->id}", [
            'name' => 'Blocked Update',
        ])->assertForbidden();

        $this->actingAs($customer)->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_a_product(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $createResponse = $this->actingAs($admin)->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'Admin Product',
            'status' => 'active',
            'images' => [
                [
                    'image_url' => 'https://example.com/product-a.jpg',
                    'sort_order' => 0,
                ],
            ],
            'variants' => [
                [
                    'sku' => 'SKU-ALLOW001',
                    'price_minor' => 3499,
                    'stock_qty' => 7,
                ],
            ],
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.name', 'Admin Product');

        $productId = $createResponse->json('data.id');

        $this->actingAs($admin)->patchJson("/api/products/{$productId}", [
            'name' => 'Admin Product Updated',
            'images' => [
                [
                    'image_url' => 'https://example.com/product-b.jpg',
                    'sort_order' => 1,
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Admin Product Updated')
            ->assertJsonPath('data.images.0.image_url', 'https://example.com/product-b.jpg');

        $this->actingAs($admin)->deleteJson("/api/products/{$productId}")
            ->assertOk();
    }

    public function test_admin_can_update_existing_product_variants(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'sku' => 'SKU-ORIGINAL001',
            'price_minor' => 1500,
            'stock_qty' => 3,
            'status' => 'active',
        ]);

        $this->actingAs($admin)->patchJson("/api/products/{$product->id}", [
            'variants' => [
                [
                    'id' => $variant->id,
                    'sku' => 'SKU-UPDATED001',
                    'price_minor' => 2999,
                    'stock_qty' => 12,
                    'status' => 'out_of_stock',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.variants.0.sku', 'SKU-UPDATED001')
            ->assertJsonPath('data.variants.0.price_minor', 2999)
            ->assertJsonPath('data.variants.0.stock_qty', 12)
            ->assertJsonPath('data.variants.0.status', 'out_of_stock');
    }

    public function test_admin_can_update_product_options_and_variant_selections(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create([
            'name' => 'Travel Jacket',
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'sku' => 'TRAVEL-JACKET-OLD-1',
            'price_minor' => 1500,
            'stock_qty' => 2,
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/products/{$product->id}", [
            'name' => 'Travel Jacket',
            'options' => [
                [
                    'name' => 'Color',
                    'values' => ['Black', 'Navy'],
                ],
                [
                    'name' => 'Size',
                    'values' => ['M', 'L'],
                ],
            ],
            'variants' => [
                [
                    'id' => $variant->id,
                    'sku' => 'TRAVEL-JACKET-BLACK-M-1',
                    'price_minor' => 2200,
                    'stock_qty' => 8,
                    'status' => 'active',
                    'options' => [
                        'Color' => 'Black',
                        'Size' => 'M',
                    ],
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.option_types.0.name', 'Color')
            ->assertJsonPath('data.variants.0.option_values.0.option_type.name', 'Color');

        $this->assertDatabaseHas('product_option_types', [
            'product_id' => $product->id,
            'name' => 'Color',
        ]);
    }

    public function test_admin_can_replace_product_images(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create();
        ProductImage::factory()->create([
            'product_id' => $product->id,
            'image_url' => 'https://example.com/original.jpg',
            'sort_order' => 0,
        ]);

        $this->actingAs($admin)->patchJson("/api/products/{$product->id}", [
            'images' => [
                [
                    'image_url' => 'https://example.com/replaced-1.jpg',
                    'sort_order' => 0,
                ],
                [
                    'image_url' => 'https://example.com/replaced-2.jpg',
                    'sort_order' => 1,
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.images.0.image_url', 'https://example.com/replaced-1.jpg')
            ->assertJsonPath('data.images.1.image_url', 'https://example.com/replaced-2.jpg');

        $this->assertDatabaseMissing('product_images', [
            'product_id' => $product->id,
            'image_url' => 'https://example.com/original.jpg',
        ]);
    }

    public function test_customer_cannot_write_categories_and_admin_can(): void
    {
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $this->actingAs($customer)->postJson('/api/categories', [
            'name' => 'Blocked Category',
            'is_active' => true,
        ])->assertForbidden();

        $this->actingAs($customer)->patchJson("/api/categories/{$category->id}", [
            'name' => 'Blocked Update',
        ])->assertForbidden();

        $created = $this->actingAs($admin)->postJson('/api/categories', [
            'name' => 'Admin Category',
            'is_active' => true,
        ]);

        $created->assertCreated()
            ->assertJsonPath('data.name', 'Admin Category');

        $createdId = $created->json('data.id');

        $this->actingAs($admin)->patchJson("/api/categories/{$createdId}", [
            'name' => 'Admin Category Updated',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Admin Category Updated');
    }
}
