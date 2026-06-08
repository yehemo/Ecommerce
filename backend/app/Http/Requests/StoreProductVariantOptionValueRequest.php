<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductVariantOptionValueRequest extends FormRequest
{
    /**
     * Anyone may attach option values to variants for now.
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
            'option_value_ids'   => ['required', 'array', 'min:1'],
            'option_value_ids.*' => ['required', 'uuid', 'exists:product_option_values,id'],
        ];
    }
}
