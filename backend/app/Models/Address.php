<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    /** @use HasFactory<\Database\Factories\AddressFactory> */
    use HasFactory, HasPrimaryUuid;

    protected $fillable = [
        'user_id',
        'type',
        'full_name',
        'phone',
        'line_1',
        'line_2',
        'city',
        'state',
        'postal_code',
        'country_code',
        'is_default',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }
}
