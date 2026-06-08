<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductVariantOptionValueRequest extends FormRequest
{
    /**
     * Anyone may sync option values on variants for now.
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
            // Can be an empty array to detach ALL option values from the variant
            'option_value_ids'   => ['required', 'array'],
            'option_value_ids.*' => ['uuid', 'exists:product_option_values,id'],
        ];
    }
}
