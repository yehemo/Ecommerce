'use client';

import { useCart } from '@/components/store/cart-provider';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const formatPrice = (minor: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(minor / 100);

export default function CartPage() {
  const { items, isLoading, updateQuantity, removeItem, subtotalMinor } = useCart();

  const taxMinor = Math.round(subtotalMinor * 0.08); // Mock 8% tax
  const totalMinor = subtotalMinor + taxMinor;

  if (isLoading) {
    return (
      <div className="flex-1 max-w-screen-xl mx-auto px-6 lg:px-10 py-20 w-full flex flex-col items-center justify-center">
        <p className="text-sm tracking-widest uppercase text-stone-400 animate-pulse">Loading Cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 max-w-screen-xl mx-auto px-6 lg:px-10 py-32 w-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extralight text-stone-900 mb-4">Your cart is empty.</h1>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Discover our latest collections.</p>
        <Link href="/store">
          <Button size="lg" className="rounded-full px-8 tracking-widest uppercase text-xs">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-12 w-full">
      <h1 className="text-3xl font-light text-stone-900 mb-10 tracking-tight">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {items.map((item) => {
            const product = item.product_variant.product;
            const image = product?.images?.[0]?.image_url;
            
            return (
              <div key={item.id} className="flex gap-4 sm:gap-6 group">
                {/* Image */}
                <Link href={`/store/products/${product.id}`} className="shrink-0 w-24 sm:w-32 aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden relative">
                  {image ? (
                    <img src={image} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-stone-400">No Image</div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex flex-col flex-1 py-1">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Link href={`/store/products/${product.id}`} className="text-lg font-medium text-stone-900 hover:opacity-70 transition-opacity">
                        {product.name}
                      </Link>
                      <div className="mt-1 space-y-0.5">
                        {item.product_variant.option_values?.map((val) => (
                          <p key={val.id} className="text-sm text-stone-500">
                            {val.option_type?.name}: {val.value}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-stone-900">{formatPrice(item.unit_price_minor)}</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-stone-200 rounded-full h-9">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 h-full text-stone-500 hover:text-black transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 h-full text-stone-500 hover:text-black transition-colors"
                        disabled={item.quantity >= item.product_variant.stock_qty}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors p-2"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4 bg-stone-50 p-6 sm:p-8 rounded-2xl sticky top-24">
          <h2 className="text-lg font-medium text-stone-900 mb-6 tracking-wide">Order Summary</h2>
          
          <div className="space-y-4 text-sm text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-stone-900">{formatPrice(subtotalMinor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (8%)</span>
              <span className="font-medium text-stone-900">{formatPrice(taxMinor)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <Separator className="my-6 bg-stone-200" />
          
          <div className="flex justify-between text-lg font-medium text-stone-900 mb-8">
            <span>Total</span>
            <span>{formatPrice(totalMinor)}</span>
          </div>

          <Button size="lg" className="w-full h-14 rounded-full text-sm font-medium tracking-[0.1em] uppercase group flex items-center justify-between px-6 bg-black text-white hover:bg-stone-800 transition-all">
            <span>Checkout</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}