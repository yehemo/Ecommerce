<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderAddressesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'shipping_address' => ['required_without:billing_address', 'array'],
            'billing_address' => ['required_without:shipping_address', 'array'],
            'shipping_address.full_name' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.phone' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line_1' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line_2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.postal_code' => ['required_with:shipping_address', 'string', 'max:255'],
            'billing_address.full_name' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.phone' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.line_1' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.line_2' => ['nullable', 'string', 'max:255'],
            'billing_address.city' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.postal_code' => ['required_with:billing_address', 'string', 'max:255'],
        ];
    }
}
