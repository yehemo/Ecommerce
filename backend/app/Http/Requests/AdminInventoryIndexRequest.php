<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminInventoryIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tab' => ['nullable', 'in:all,low_stock,out_of_stock'],
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }
}
