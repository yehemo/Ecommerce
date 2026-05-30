<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductVariantOptionValue extends Pivot
{
    /**
     * Pure pivot table — no surrogate primary key, no timestamps.
     * Laravel's BelongsToMany::attach() only inserts the two FK columns,
     * so this must be a Pivot (not a full Model with HasPrimaryUuid).
     */
    public $incrementing = false;
    public $timestamps   = false;

    protected $table = 'product_variant_option_values';

    protected $fillable = [
        'product_variant_id',
        'option_value_id',
    ];

    /**
     * @return BelongsTo<ProductOptionValue, $this>
     */
    public function optionValue(): BelongsTo
    {
        return $this->belongsTo(ProductOptionValue::class, 'option_value_id');
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
