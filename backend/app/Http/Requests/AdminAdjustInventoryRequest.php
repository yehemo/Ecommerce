<?php

namespace App\Http\Requests;

use App\Services\Inventory\InventoryService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AdminAdjustInventoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'in:set,increment,decrement'],
            'quantity' => ['required', 'integer', 'min:0'],
            'reason' => ['required', 'in:'.implode(',', InventoryService::ADMIN_REASONS)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $action = $this->input('action');
            $quantity = (int) $this->input('quantity');

            if (in_array($action, ['increment', 'decrement'], true) && $quantity < 1) {
                $validator->errors()->add('quantity', 'Increment and decrement adjustments must be at least 1.');
            }
        });
    }
}
