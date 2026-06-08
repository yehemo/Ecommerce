<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductVariantRequest extends FormRequest
{
    /**
     * Anyone may update variants for now.
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
        // Ignore the current variant's own SKU when checking uniqueness
        $variantId = $this->route('variant')?->id;

        return [
            'sku'              => ['sometimes', 'string', 'max:100', Rule::unique('product_variants', 'sku')->ignore($variantId)],
            'price_minor'      => ['sometimes', 'integer', 'min:0'],
            'stock_qty'        => ['sometimes', 'integer', 'min:0'],
            'status'           => ['sometimes', 'string', 'in:active,inactive'],
            'option_value_ids'   => ['sometimes', 'array'],
            'option_value_ids.*' => ['uuid', 'exists:product_option_values,id'],
        ];
    }
}
