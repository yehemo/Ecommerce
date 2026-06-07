<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderShipment extends Model
{
    /** @use HasFactory<\Database\Factories\OrderShipmentFactory> */
    use HasFactory, HasPrimaryUuid;

    protected $fillable = [
        'order_id',
        'carrier',
        'tracking_number',
        'tracking_url',
        'status',
        'shipped_at',
        'delivered_at',
        'notes',
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
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }
}
