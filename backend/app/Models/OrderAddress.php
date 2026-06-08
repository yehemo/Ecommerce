<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderAddress extends Model
{
    /** @use HasFactory<\Database\Factories\OrderAddressFactory> */
    use HasFactory, HasPrimaryUuid;

    protected $fillable = [
        'order_id',
        'type',
        'full_name',
        'phone',
        'line_1',
        'line_2',
        'city',
        'postal_code',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
