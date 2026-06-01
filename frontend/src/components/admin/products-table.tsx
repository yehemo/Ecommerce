'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/axios';

type Product = {
  id: string;
  name: string;
  status: string;
  category?: {
    name: string;
  } | null;
  variants?: Array<{
    id: string;
    price_minor: number;
    stock_qty: number;
  }>;
};

type ProductResponse = {
  data: Product[];
};

const fetcher = (url: string) => axios.get(url).then((res) => res.data as ProductResponse);

const formatPrice = (minor: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(minor / 100);

export function ProductsTable() {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { data, error, mutate, isLoading } = useSWR('/api/products?per_page=100', fetcher);

  const deleteProduct = async (productId: string) => {
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');

    if (!confirmed) return;

    setIsDeleting(productId);

    try {
      await axios.get('/sanctum/csrf-cookie');
      await axios.delete(`/api/products/${productId}`);
      await mutate();
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-stone-300">Loading products…</div>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-8 text-red-200">Failed to load products.</div>;
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Product Catalog</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Manage products</h2>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
        >
          Add product
        </Link>
      </div>

      <div className="divide-y divide-white/10">
        {data?.data.length ? (
          data.data.map((product) => {
            const firstVariant = product.variants?.[0];

            return (
              <article
                key={product.id}
                className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="truncate text-lg font-medium text-white">{product.name}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-400">
                      {product.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-400">
                    <span>Category: {product.category?.name ?? 'Uncategorized'}</span>
                    <span>Variants: {product.variants?.length ?? 0}</span>
                    <span>
                      First price: {firstVariant ? formatPrice(firstVariant.price_minor) : '—'}
                    </span>
                    <span>
                      Total stock: {product.variants?.reduce((total, variant) => total + variant.stock_qty, 0) ?? 0}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    disabled={isDeleting === product.id}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting === product.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="px-6 py-10 text-center text-stone-400">No products found.</div>
        )}
      </div>
    </div>
  );
}
