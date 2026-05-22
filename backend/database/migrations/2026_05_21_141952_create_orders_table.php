<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->restrictOnDelete();
            $table->string('order_number')->unique();
            $table->string('status')->default('pending')->index();
            $table->string('payment_status')->default('unpaid')->index();
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('subtotal_minor')->default(0);
            $table->unsignedInteger('discount_minor')->default(0);
            $table->unsignedInteger('tax_minor')->default(0);
            $table->unsignedInteger('shipping_fee_minor')->default(0);
            $table->unsignedInteger('total_minor')->default(0);
            $table->timestamp('placed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
