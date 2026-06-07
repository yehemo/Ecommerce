<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    /** @use HasFactory<\Database\Factories\PaymentFactory> */
    use HasFactory, HasPrimaryUuid;

    protected $fillable = [
        'order_id',
        'provider',
        'provider_reference',
        'provider_status',
        'provider_approval_code',
        'amount_minor',
        'currency',
        'status',
        'qr_string',
        'qr_image',
        'deeplink',
        'callback_payload',
        'expires_at',
        'verified_at',
        'paid_at',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    protected function casts(): array
    {
        return [
            'callback_payload' => 'array',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }
}
