'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import axios from '@/lib/axios';
import { Loader2, ShoppingBag, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/components/store/cart-provider';

// Types based on the API response structure
type Category = { id: string; name: string; };
type ProductOptionValue = { id: string; value: string; option_type?: { id: string; name: string; } };
type ProductOptionType = { id: string; name: string; values: Array<{ id: string; value: string; }> };
type ProductVariant = { 
  id: string; 
  sku: string; 
  price_minor: number; 
  stock_qty: number; 
  status: string; 
  option_values?: ProductOptionValue[]; 
};
type ProductImage = { id: string; image_url: string; sort_order: number; };
type Product = { 
  id: string; 
  category_id: string; 
  name: string; 
  description: string | null; 
  status: string; 
  variants: ProductVariant[]; 
  option_types: ProductOptionType[]; 
  images: ProductImage[]; 
  category: Category;
};

type ApiResponse = {
  data: Product;
};

const fetcher = (url: string) => axios.get(url).then(res => res.data as ApiResponse);

const formatPrice = (minor: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(minor / 100);

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, error, isLoading } = useSWR(
    id ? `/api/products/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const product = data?.data;
  const { addItem } = useCart();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Initialize selected options to the first available variant's options when loaded
  useEffect(() => {
    if (!product || product.variants.length === 0) return;

    setSelectedOptions((current) => {
      // Only initialize if currently empty
      if (Object.keys(current).length > 0) return current;

      const firstVariant = product.variants[0];
      const initialOptions: Record<string, string> = {};
      firstVariant.option_values?.forEach(ov => {
        if (ov.option_type) initialOptions[ov.option_type.name] = ov.value;
      });
      
      // If the product has no options, we don't need to change state.
      if (Object.keys(initialOptions).length === 0) return current;

      return initialOptions;
    });
  }, [product]);

  // Find the variant that matches the currently selected options
  const currentVariant = useMemo(() => {
    if (!product || !product.variants) return null;
    
    return product.variants.find(variant => {
      if (!variant.option_values) return false;
      
      const variantOptions: Record<string, string> = {};
      variant.option_values.forEach(ov => {
        if (ov.option_type) variantOptions[ov.option_type.name] = ov.value;
      });
      
      // Check if all selected options match this variant
      return Object.entries(selectedOptions).every(
        ([key, value]) => variantOptions[key] === value
      );
    }) || null;
  }, [product, selectedOptions]);

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
    setAdded(false);
  };

  const handleAddToCart = async () => {
    if (!currentVariant || currentVariant.stock_qty <= 0 || !product) return;
    
    setIsAdding(true);
    try {
      await addItem(currentVariant, product, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-stone-400">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-stone-300" />
        <p className="text-sm tracking-widest uppercase">Loading Product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-stone-400">
        <p className="text-lg">Product not found.</p>
        <Link href="/store" className="mt-4 text-sm underline hover:text-stone-900 transition-colors">
          Return to Store
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? [...product.images].sort((a, b) => a.sort_order - b.sort_order) : [];
  const activeImage = images[activeImageIndex];

  return (
    <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-12 w-full">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[11px] font-medium tracking-[0.15em] uppercase text-stone-400 mb-10">
        <Link href="/store" className="hover:text-stone-900 transition-colors">Store</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="hover:text-stone-900 transition-colors cursor-pointer">{product.category?.name || 'Category'}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-stone-900 truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        
        {/* Left: Image Gallery */}
        <div className="flex flex-col-reverse lg:flex-row gap-4 h-fit sticky top-24">
          {images.length > 1 && (
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar py-1 lg:py-0">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 aspect-[3/4] flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    idx === activeImageIndex ? 'border-stone-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt={`${product.name} - view ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          
          <div className="relative w-full aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden group">
            {activeImage ? (
              <img 
                src={activeImage.image_url} 
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-stone-300 text-sm tracking-widest uppercase">No Image Available</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="flex flex-col pt-2 lg:pt-8">
          <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-stone-500 mb-2">
            {product.category?.name || 'Uncategorized'}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-stone-950 mb-4">
            {product.name}
          </h1>
          
          <div className="text-2xl font-light text-stone-900 mb-8">
            {currentVariant ? formatPrice(currentVariant.price_minor) : '—'}
          </div>

          <Separator className="mb-8" />

          {/* Options Selection */}
          {product.option_types?.length > 0 && (
            <div className="space-y-8 mb-10">
              {product.option_types.map((optionType) => (
                <div key={optionType.id}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-stone-900 uppercase tracking-wider">{optionType.name}</span>
                    <span className="text-xs text-stone-500">{selectedOptions[optionType.name] || 'Select an option'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {optionType.values.map((val) => {
                      const isSelected = selectedOptions[optionType.name] === val.value;
                      return (
                        <button
                          key={val.id}
                          onClick={() => handleOptionSelect(optionType.name, val.value)}
                          className={`
                            px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 border
                            ${isSelected 
                              ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900'
                            }
                          `}
                        >
                          {val.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add to Cart Status & Button */}
          <div className="space-y-4 mb-12">
            <div className="flex items-center justify-between text-sm">
              {currentVariant ? (
                currentVariant.stock_qty > 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    In Stock
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    Out of Stock
                  </span>
                )
              ) : (
                <span className="text-stone-400">Variant unavailable</span>
              )}
            </div>

            <Button 
              size="lg" 
              className={`w-full h-14 rounded-full text-sm font-medium tracking-[0.1em] uppercase transition-all duration-300 ${added ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-stone-950 hover:bg-stone-800 text-white'}`}
              disabled={!currentVariant || currentVariant.stock_qty <= 0 || isAdding}
              onClick={handleAddToCart}
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : added ? (
                <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Added to Cart</span>
              ) : (
                <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Add to Cart</span>
              )}
            </Button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm prose-stone max-w-none text-stone-500 leading-relaxed">
              <h3 className="text-sm font-medium tracking-wider uppercase text-stone-900 mb-3">Details</h3>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Dummy Accordeon/Extra Info */}
          <div className="mt-10 border-t border-stone-100 divide-y divide-stone-100">
             <div className="py-5 flex justify-between items-center text-sm font-medium text-stone-900 cursor-pointer group">
               <span className="uppercase tracking-widest text-[11px]">Shipping & Returns</span>
               <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />
             </div>
             <div className="py-5 flex justify-between items-center text-sm font-medium text-stone-900 cursor-pointer group">
               <span className="uppercase tracking-widest text-[11px]">Material & Care</span>
               <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}