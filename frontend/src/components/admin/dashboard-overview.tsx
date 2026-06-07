'use client';

import Link from 'next/link';
import useSWR from 'swr';
import axios from '@/lib/axios';

type PaginatedSummary = {
  total?: number;
  data?: unknown[];
};

const fetcher = (url: string) => axios.get(url).then((res) => res.data as PaginatedSummary);

export function DashboardOverview() {
  const { data: productSummary } = useSWR('/api/products?per_page=1', fetcher);
  const { data: categorySummary } = useSWR('/api/categories?per_page=1', fetcher);
  const { data: orderSummary } = useSWR('/api/admin/orders', fetcher);

  const stats = [
    {
      label: 'Orders',
      value: orderSummary?.total ?? orderSummary?.data?.length ?? '—',
      hint: 'Every customer order currently available for admin review and fulfillment.',
    },
    {
      label: 'Products',
      value: productSummary?.total ?? '—',
      hint: 'All catalog entries currently exposed by the product API.',
    },
    {
      label: 'Categories',
      value: categorySummary?.total ?? '—',
      hint: 'Public taxonomy groups available for product assignment.',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-300">Admin Dashboard</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Catalog control starts here.</h2>
            <p className="text-sm leading-6 text-stone-300">
              Use the admin area to publish products, review incoming orders, and keep fulfillment moving without losing catalog quality.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 lg:justify-end">
            <Link
              href="/admin/orders"
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:text-white sm:px-4 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
            >
              View orders
            </Link>
            <Link
              href="/admin/products"
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:text-white sm:px-4 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
            >
              View products
            </Link>
            <Link
              href="/admin/categories"
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:text-white sm:px-4 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
            >
              View categories
            </Link>
            <Link
              href="/admin/products/new"
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-stone-950 transition hover:bg-stone-200 sm:px-4 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
            >
              Add product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">{stat.label}</p>
            <p className="mt-4 text-4xl font-semibold text-white">{stat.value}</p>
            <p className="mt-3 text-sm leading-6 text-stone-400">{stat.hint}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
