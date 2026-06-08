<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductVariantRequest extends FormRequest
{
    /**
     * Anyone may create variants for now.
     * Tighten with a Policy when auth is wired up.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sku'              => ['required', 'string', 'max:100', 'unique:product_variants,sku'],
            'price_minor'      => ['required', 'integer', 'min:0'],
            'stock_qty'        => ['sometimes', 'integer', 'min:0'],
            'status'           => ['sometimes', 'string', 'in:active,inactive'],
            'option_value_ids'   => ['sometimes', 'array'],
            'option_value_ids.*' => ['uuid', 'exists:product_option_values,id'],
        ];
    }
}
