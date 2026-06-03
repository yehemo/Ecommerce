'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductsGrid } from '@/components/store/products-grid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductListingProps {
  title: string;
  baseQuery: string; // e.g. "category_slug=women" or "is_new_arrival=true"
}

function ProductListingContent({ title, baseQuery }: ProductListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for filters and sorting
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [sizes, setSizes] = useState<string[]>(searchParams.get('sizes')?.split(',') || []);
  const [colors, setColors] = useState<string[]>(searchParams.get('colors')?.split(',') || []);
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  // Update URL and trigger refetch when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (sort) params.set('sort', sort);
    if (sizes.length > 0) params.set('sizes', sizes.join(','));
    if (colors.length > 0) params.set('colors', colors.join(','));
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);

    const newQuery = params.toString();
    router.replace(`?${newQuery}`, { scroll: false });
  }, [sort, sizes, colors, minPrice, maxPrice, router]);

  const handleSizeToggle = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleColorToggle = (color: string) => {
    setColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSizes([]);
    setColors([]);
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  // Combine baseQuery with current searchParams
  const currentParams = searchParams.toString();
  const fullQuery = currentParams ? `${baseQuery}&${currentParams}` : baseQuery;

  // Static options for demo purposes (would ideally come from API)
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'];
  const availableColors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Beige'];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-20 w-full">
      <div className="flex flex-col md:flex-row items-baseline justify-between mb-12 gap-6 border-b border-stone-200 pb-6">
        <h1 className="text-3xl md:text-5xl font-light tracking-[0.1em] uppercase text-stone-900">
          {title}
        </h1>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500 whitespace-nowrap">
            Sort By
          </span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px] bg-white text-xs tracking-wider uppercase border-stone-200 rounded-none h-10">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-white border-stone-200">
              <SelectItem value="newest" className="text-xs tracking-wider uppercase focus:bg-stone-50">Newest Arrivals</SelectItem>
              <SelectItem value="price_asc" className="text-xs tracking-wider uppercase focus:bg-stone-50">Price: Low to High</SelectItem>
              <SelectItem value="price_desc" className="text-xs tracking-wider uppercase focus:bg-stone-50">Price: High to Low</SelectItem>
              <SelectItem value="name_asc" className="text-xs tracking-wider uppercase focus:bg-stone-50">Name: A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium tracking-[0.1em] uppercase text-stone-900">Filters</h3>
              {(sizes.length > 0 || colors.length > 0 || minPrice || maxPrice) && (
                <button 
                  onClick={clearFilters}
                  className="text-[10px] uppercase tracking-[0.15em] text-stone-400 hover:text-stone-900 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="space-y-8">
              {/* Size Filter */}
              <div>
                <h4 className="text-xs font-medium tracking-[0.1em] uppercase text-stone-600 mb-3">Size</h4>
                <div className="grid grid-cols-3 gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`h-10 text-xs font-medium tracking-wider uppercase border transition-colors ${
                        sizes.includes(size)
                          ? 'border-black bg-black text-white'
                          : 'border-stone-200 text-stone-600 hover:border-stone-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div>
                <h4 className="text-xs font-medium tracking-[0.1em] uppercase text-stone-600 mb-3">Color</h4>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorToggle(color)}
                      className={`px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase border transition-colors ${
                        colors.includes(color)
                          ? 'border-black bg-black text-white'
                          : 'border-stone-200 text-stone-600 hover:border-stone-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h4 className="text-xs font-medium tracking-[0.1em] uppercase text-stone-600 mb-3">Price Range ($)</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-stone-200 focus:outline-none focus:border-stone-900 transition-colors"
                  />
                  <span className="text-stone-400">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-stone-200 focus:outline-none focus:border-stone-900 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            <ProductsGrid queryString={`${fullQuery}&status=active`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductListing(props: ProductListingProps) {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      <ProductListingContent {...props} />
    </Suspense>
  );
}
