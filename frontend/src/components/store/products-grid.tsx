'use client';

import Link from 'next/link';
import useSWR from 'swr';
import axios from '@/lib/axios';

type ProductVariant = {
  id: string;
  price_minor: number;
  stock_qty: number;
};

type Product = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  variants?: ProductVariant[];
};

type ProductsApiResponse = {
  data: Product[];
  total: number;
};

const fetcher = (url: string) =>
  axios.get(url).then((res) => res.data as ProductsApiResponse);

const formatPrice = (minor: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(minor / 100);

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-stone-100 animate-pulse">
      <div className="aspect-[3/4] bg-stone-100" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="h-4 bg-stone-100 rounded w-3/4" />
        <div className="h-4 bg-stone-100 rounded w-1/4" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="text-stone-700 font-medium">No products yet</p>
        <p className="text-stone-400 text-sm mt-1">Check back soon for new arrivals.</p>
      </div>
    </div>
  );
}

export function ProductsGrid() {
  const { data, error, isLoading } = useSWR(
    '/api/products?per_page=12&status=active',
    fetcher,
    { revalidateOnFocus: false }
  );

  if (error) {
    return (
      <div className="col-span-full text-center py-12 text-stone-400 text-sm">
        Unable to load products right now.
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </>
    );
  }

  const products = data?.data ?? [];

  if (!products.length) {
    return <EmptyState />;
  }

  return (
    <>
      {products.map((product) => {
        const firstVariant = product.variants?.[0];
        const totalStock = product.variants?.reduce((sum, v) => sum + v.stock_qty, 0) ?? 0;
        const isOutOfStock = totalStock === 0;

        return (
          <article
            key={product.id}
            className="group bg-white rounded-xl overflow-hidden border border-stone-100 hover:shadow-md transition-shadow duration-300"
          >
            {/* Product image placeholder */}
            <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {isOutOfStock && (
                <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-stone-200 text-stone-600">
                  Sold Out
                </span>
              )}

              {/* Quick view hover overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <Link
                  href={`/store/products/${product.id}`}
                  className="block w-full bg-black text-white text-[11px] font-medium tracking-[0.1em] uppercase py-2.5 rounded-lg hover:bg-stone-800 transition-colors text-center"
                >
                  View Product
                </Link>
              </div>
            </div>

            {/* Product info */}
            <div className="p-4">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mb-1">
                {product.category?.name ?? 'Uncategorized'}
              </p>
              <h3 className="text-sm font-medium text-stone-900 leading-snug">{product.name}</h3>
              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {firstVariant ? formatPrice(firstVariant.price_minor) : '—'}
              </p>
            </div>
          </article>
        );
      })}
    </>
  );
}
