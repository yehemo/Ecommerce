<?php

namespace App\Models;

use App\Models\Concerns\HasPrimaryUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    /** @use HasFactory<\Database\Factories\ProductImageFactory> */
    use HasFactory, HasPrimaryUuid;

    protected $fillable = [
        'product_id',
        'variant_id',
        'image_url',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function getImageUrlAttribute(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        if (preg_match('#^https?://#', $value) === 1) {
            $parts = parse_url($value);

            if (
                isset($parts['host'], $parts['path']) &&
                in_array($parts['host'], ['localhost', '127.0.0.1'], true) &&
                str_starts_with($parts['path'], '/storage/')
            ) {
                return rtrim(config('app.url'), '/') . $parts['path'];
            }

            return $value;
        }

        return rtrim(config('app.url'), '/') . '/' . ltrim($value, '/');
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
