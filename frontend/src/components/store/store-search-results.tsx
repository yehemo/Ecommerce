'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductsGrid } from '@/components/store/products-grid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Search, X } from 'lucide-react';

export function StoreSearchResults({
  initialQuery,
  initialSort = 'newest',
}: {
  initialQuery: string;
  initialSort?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort || 'newest');

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('search', initialQuery);

    if (sort) {
      params.set('sort', sort);
    }

    router.replace(`/store?${params.toString()}`, { scroll: false });
  }, [initialQuery, router, sort]);

  const clearSearch = () => {
    router.push('/store');
  };

  const queryString = `search=${encodeURIComponent(initialQuery)}&sort=${encodeURIComponent(sort)}&status=active`;

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-20 w-full">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Button variant="ghost" className="w-fit px-0 text-stone-500 hover:text-black" onClick={clearSearch}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-500">
              <Search className="h-3.5 w-3.5" />
              Search Results
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-light tracking-[0.1em] uppercase text-stone-900">
                Results for "{initialQuery}"
              </h1>
              <p className="mt-2 max-w-xl text-sm text-stone-500">
                Browse matching products and refine the order with sorting.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" onClick={clearSearch}>
            <X className="mr-2 h-4 w-4" />
            Clear search
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.15em] text-stone-500 whitespace-nowrap">
              Sort By
            </span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[200px] bg-white text-xs tracking-wider uppercase border-stone-200 rounded-none h-10">
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
      </div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <ProductsGrid
          queryString={queryString}
          emptyTitle={`No matches for "${initialQuery}"`}
          emptyDescription="Try a different product name or clear your search to keep browsing."
        />
      </div>
    </div>
  );
}
