<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReportsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_reports(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)
            ->getJson('/api/admin/reports')
            ->assertForbidden();
    }

    public function test_admin_reports_return_summary_top_products_and_low_stock_snapshot(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $topProduct = Product::factory()->create(['name' => 'Top Product']);
        $topVariant = ProductVariant::factory()->for($topProduct, 'product')->create([
            'sku' => 'SKU-TOP001',
            'stock_qty' => 4,
        ]);

        $secondProduct = Product::factory()->create(['name' => 'Second Product']);
        $secondVariant = ProductVariant::factory()->for($secondProduct, 'product')->create([
            'sku' => 'SKU-SECOND001',
            'stock_qty' => 0,
        ]);

        $healthyVariant = ProductVariant::factory()->create([
            'sku' => 'SKU-HEALTHY001',
            'stock_qty' => 16,
        ]);

        $paidOrder = Order::factory()->for($customer)->create([
            'status' => 'processing',
            'payment_status' => 'paid',
            'total_minor' => 15000,
            'placed_at' => now()->subDays(2),
        ]);

        OrderItem::factory()->for($paidOrder)->create([
            'product_id' => $topProduct->id,
            'product_variant_id' => $topVariant->id,
            'product_name' => $topProduct->name,
            'sku' => $topVariant->sku,
            'unit_price_minor' => 3000,
            'quantity' => 3,
            'line_total_minor' => 9000,
        ]);

        OrderItem::factory()->for($paidOrder)->create([
            'product_id' => $secondProduct->id,
            'product_variant_id' => $secondVariant->id,
            'product_name' => $secondProduct->name,
            'sku' => $secondVariant->sku,
            'unit_price_minor' => 2000,
            'quantity' => 2,
            'line_total_minor' => 4000,
        ]);

        $pendingOrder = Order::factory()->for($customer)->create([
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'total_minor' => 22000,
            'placed_at' => now()->subDays(1),
        ]);

        $cancelledOrder = Order::factory()->for($customer)->create([
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
            'total_minor' => 12000,
            'placed_at' => now()->subDays(1),
        ]);

        $oldPaidOrder = Order::factory()->for($customer)->create([
            'status' => 'delivered',
            'payment_status' => 'paid',
            'total_minor' => 9999,
            'placed_at' => now()->subDays(45),
        ]);

        OrderItem::factory()->for($oldPaidOrder)->create([
            'product_id' => $topProduct->id,
            'product_variant_id' => $topVariant->id,
            'product_name' => $topProduct->name,
            'sku' => $topVariant->sku,
            'unit_price_minor' => 9999,
            'quantity' => 1,
            'line_total_minor' => 9999,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/reports?range=30d')
            ->assertOk()
            ->assertJsonPath('data.range', '30d')
            ->assertJsonPath('data.summary.total_orders', 3)
            ->assertJsonPath('data.summary.paid_orders', 1)
            ->assertJsonPath('data.summary.pending_payment_orders', 1)
            ->assertJsonPath('data.summary.cancelled_orders', 1)
            ->assertJsonPath('data.summary.gross_revenue_minor', 15000)
            ->assertJsonPath('data.summary.average_order_value_minor', 15000)
            ->assertJsonPath('data.summary.low_stock_count', 1)
            ->assertJsonPath('data.summary.out_of_stock_count', 1)
            ->assertJsonPath('data.status_breakdown.pending_shipping', 1)
            ->assertJsonPath('data.status_breakdown.cancelled', 1)
            ->assertJsonPath('data.top_products.0.product_name', 'Top Product')
            ->assertJsonPath('data.top_products.0.units_sold', 3)
            ->assertJsonPath('data.top_products.0.revenue_minor', 9000)
            ->assertJsonPath('data.low_stock_variants.0.sku', 'SKU-SECOND001')
            ->assertJsonPath('data.low_stock_variants.1.sku', 'SKU-TOP001');

        $this->assertDatabaseHas('product_variants', [
            'id' => $healthyVariant->id,
            'stock_qty' => 16,
        ]);
    }

    public function test_admin_reports_today_range_filters_out_older_orders(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        Order::factory()->for($customer)->create([
            'status' => 'processing',
            'payment_status' => 'paid',
            'total_minor' => 8000,
            'placed_at' => now()->subHours(2),
        ]);

        Order::factory()->for($customer)->create([
            'status' => 'processing',
            'payment_status' => 'paid',
            'total_minor' => 12000,
            'placed_at' => now()->subDays(4),
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/reports?range=today')
            ->assertOk()
            ->assertJsonPath('data.summary.total_orders', 1)
            ->assertJsonPath('data.summary.paid_orders', 1)
            ->assertJsonPath('data.summary.gross_revenue_minor', 8000);
    }
}
