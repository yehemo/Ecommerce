<?php

namespace App\Services\Checkout;

use App\Models\Cart;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    private const CURRENCY = 'USD';
    private const TAX_RATE = 0.08;

    public function __construct(private readonly InventoryService $inventoryService)
    {
    }

    public function createOrderFromActiveCart(User $user, array $shippingAddress, array $billingAddress): Order
    {
        return DB::transaction(function () use ($user, $shippingAddress, $billingAddress) {
            $cart = Cart::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->with([
                    'items.productVariant.product',
                ])
                ->lockForUpdate()
                ->firstOrCreate([
                    'user_id' => $user->id,
                    'status' => 'active',
                ]);

            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => ['Your cart is empty.'],
                ]);
            }

            $variants = ProductVariant::query()
                ->whereIn('id', $cart->items->pluck('product_variant_id'))
                ->with('product')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $validatedItems = $cart->items->map(function ($item) use ($variants) {
                $variant = $variants->get($item->product_variant_id);

                if (!$variant || !$variant->product) {
                    throw ValidationException::withMessages([
                        'cart' => ['One or more cart items are no longer available.'],
                    ]);
                }

                if ($variant->stock_qty < $item->quantity) {
                    throw ValidationException::withMessages([
                        'cart' => ["Insufficient stock for SKU {$variant->sku}."],
                    ]);
                }

                $unitPrice = (int) $item->unit_price_minor;
                $quantity = (int) $item->quantity;

                return [
                    'product_id' => $variant->product->id,
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'sku' => $variant->sku,
                    'unit_price_minor' => $unitPrice,
                    'quantity' => $quantity,
                    'line_total_minor' => $unitPrice * $quantity,
                ];
            });

            $subtotalMinor = $validatedItems->sum('line_total_minor');
            $discountMinor = 0;
            $shippingFeeMinor = 0;
            $taxMinor = (int) round($subtotalMinor * self::TAX_RATE);
            $totalMinor = $subtotalMinor - $discountMinor + $shippingFeeMinor + $taxMinor;

            $order = Order::query()->create([
                'user_id' => $user->id,
                'order_number' => $this->generateOrderNumber(),
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'currency' => self::CURRENCY,
                'subtotal_minor' => $subtotalMinor,
                'discount_minor' => $discountMinor,
                'shipping_fee_minor' => $shippingFeeMinor,
                'tax_minor' => $taxMinor,
                'total_minor' => $totalMinor,
                'placed_at' => now(),
            ]);

            $order->items()->createMany($validatedItems->all());

            foreach ($validatedItems as $validatedItem) {
                $variant = $variants->get($validatedItem['product_variant_id']);

                if ($variant) {
                    $this->inventoryService->reserveForCheckout(
                        $variant,
                        $validatedItem['quantity'],
                        $order,
                    );
                }
            }

            $order->addresses()->createMany([
                $this->normalizeAddress($shippingAddress, 'shipping'),
                $this->normalizeAddress($billingAddress, 'billing'),
            ]);

            $order->payments()->create([
                'provider' => 'manual',
                'provider_reference' => null,
                'amount_minor' => $totalMinor,
                'currency' => self::CURRENCY,
                'status' => 'pending',
            ]);

            $cart->update([
                'status' => 'completed',
            ]);

            return $order->load(['items', 'addresses', 'payments']);
        });
    }

    /**
     * @param  array<string, mixed>  $address
     * @return array<string, mixed>
     */
    private function normalizeAddress(array $address, string $type): array
    {
        return [
            'type' => $type,
            'full_name' => $address['full_name'],
            'phone' => $address['phone'],
            'line_1' => $address['line_1'],
            'line_2' => $address['line_2'] ?? null,
            'city' => $address['city'],
            'postal_code' => $address['postal_code'],
        ];
    }

    private function generateOrderNumber(): string
    {
        do {
            $orderNumber = 'ORD-'.now()->format('YmdHis').'-'.strtoupper(str()->random(6));
        } while (Order::query()->where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }
}
