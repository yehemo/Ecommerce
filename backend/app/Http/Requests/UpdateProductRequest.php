<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
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
            'category_id' => 'sometimes|uuid|exists:categories,id',
            'name'        => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'status'      => 'sometimes|string|in:active,inactive,draft',
            'is_new_arrival' => 'sometimes|boolean',
            'options'                => 'sometimes|array',
            'options.*.name'         => 'required_with:options|string|max:100',
            'options.*.values'       => 'required_with:options|array|min:1',
            'options.*.values.*'     => 'required|string|max:100',
            'variants'               => 'sometimes|array|min:1',
            'variants.*.id'          => 'sometimes|uuid|exists:product_variants,id',
            'variants.*.sku'         => 'required_with:variants|string',
            'variants.*.price_minor' => 'required_with:variants|integer|min:0',
            'variants.*.stock_qty'   => 'required_with:variants|integer|min:0',
            'variants.*.status'      => 'sometimes|string|in:active,out_of_stock,archived',
            'variants.*.options'     => 'sometimes|array',
            'images'                 => 'sometimes|array',
            'images.*.image_url'     => 'required_with:images|url|max:2048',
            'images.*.sort_order'    => 'sometimes|integer|min:0',
        ];
    }
}
