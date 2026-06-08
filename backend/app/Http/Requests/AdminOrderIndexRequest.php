<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminOrderIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'tab' => ['nullable', 'string', 'in:all,pending_payment,pending_shipping,shipped,delivered,cancelled'],
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }
}
