<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariantOptionValue extends Model
{
    /** @use HasFactory<\Database\Factories\ProductVariantOptionValueFactory> */
    use HasFactory, HasPrimaryUuid;

    public $timestamps = false;

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
