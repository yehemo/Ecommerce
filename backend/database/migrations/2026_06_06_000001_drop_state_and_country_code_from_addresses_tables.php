<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn(['state', 'country_code']);
        });

        Schema::table('order_addresses', function (Blueprint $table) {
            $table->dropColumn(['state', 'country_code']);
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('state')->default('');
            $table->string('country_code', 2)->default('');
        });

        Schema::table('order_addresses', function (Blueprint $table) {
            $table->string('state')->default('');
            $table->string('country_code', 2)->default('');
        });
    }
};
