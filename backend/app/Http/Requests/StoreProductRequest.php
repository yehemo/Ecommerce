<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id'            => 'required|uuid|exists:categories,id',
            'name'                   => 'required|string|max:255',
            'description'            => 'nullable|string',
            'status'                 => 'sometimes|string|in:active,inactive,draft',

            // Options: [{ name: 'Color', values: ['Red', 'Blue'] }]
            'options'                => 'sometimes|array',
            'options.*.name'         => 'required_with:options|string|max:100',
            'options.*.values'       => 'required_with:options|array|min:1',
            'options.*.values.*'     => 'required|string|max:100',

            // Variants
            'variants'               => 'required|array|min:1',
            'variants.*.sku'         => 'required|string|unique:product_variants,sku',
            'variants.*.price_minor' => 'required|integer|min:0',
            'variants.*.stock_qty'   => 'required|integer|min:0',
            'variants.*.status'      => 'sometimes|string|in:active,out_of_stock,archived',
            'variants.*.options'     => 'sometimes|array',
            'images'                 => 'sometimes|array',
            'images.*.image_url'     => 'required_with:images|url|max:2048',
            'images.*.sort_order'    => 'sometimes|integer|min:0',
        ];
    }
}
