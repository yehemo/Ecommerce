<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('provider_status')->nullable()->after('provider_reference');
            $table->string('provider_approval_code')->nullable()->after('provider_status');
            $table->text('qr_string')->nullable()->after('provider_approval_code');
            $table->longText('qr_image')->nullable()->after('qr_string');
            $table->text('deeplink')->nullable()->after('qr_image');
            $table->json('callback_payload')->nullable()->after('deeplink');
            $table->timestamp('expires_at')->nullable()->after('callback_payload');
            $table->timestamp('verified_at')->nullable()->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'provider_status',
                'provider_approval_code',
                'qr_string',
                'qr_image',
                'deeplink',
                'callback_payload',
                'expires_at',
                'verified_at',
            ]);
        });
    }
};
