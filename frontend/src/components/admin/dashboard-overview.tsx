'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/axios';

type ReportResponse = {
  data: {
    range: 'today' | '7d' | '30d' | 'all';
    summary: {
      total_orders: number;
      paid_orders: number;
      pending_payment_orders: number;
      cancelled_orders: number;
      gross_revenue_minor: number;
      average_order_value_minor: number;
      low_stock_count: number;
      out_of_stock_count: number;
      currency: string;
    };
    status_breakdown: {
      pending_payment: number;
      pending_shipping: number;
      shipped: number;
      delivered: number;
      cancelled: number;
    };
    top_products: Array<{
      product_id: string | null;
      product_name: string;
      units_sold: number;
      revenue_minor: number;
    }>;
    low_stock_variants: Array<{
      id: string;
      sku: string;
      stock_qty: number;
      stock_state: 'in_stock' | 'low_stock' | 'out_of_stock';
      option_summary: string;
      product: {
        id: string | null;
        name: string | null;
      };
    }>;
  };
};

const fetcher = (url: string) => axios.get(url).then((res) => res.data as ReportResponse);

const ranges: Array<{ id: 'today' | '7d' | '30d' | 'all'; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
];

const formatPrice = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minor / 100);

const stockStateLabel = (state: 'in_stock' | 'low_stock' | 'out_of_stock') => {
  if (state === 'out_of_stock') return 'Out of Stock';
  if (state === 'low_stock') return 'Low Stock';
  return 'In Stock';
};

export function DashboardOverview() {
  const [activeRange, setActiveRange] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const { data: reportData, error, isLoading } = useSWR(`/api/admin/reports?range=${activeRange}`, fetcher);
  const report = reportData?.data;
  const summary = reportData?.data.summary;
  const statusBreakdown = reportData?.data.status_breakdown;

  const stats = [
    {
      label: 'Orders',
      value: summary?.total_orders ?? '—',
      hint: 'Orders placed in the selected reporting range across every customer account.',
    },
    {
      label: 'Revenue',
      value: summary ? formatPrice(summary.gross_revenue_minor, summary.currency) : '—',
      hint: 'Gross paid revenue captured from orders in the selected range.',
    },
    {
      label: 'Paid Orders',
      value: summary?.paid_orders ?? '—',
      hint: 'Orders already converted into paid revenue and ready for fulfillment tracking.',
    },
    {
      label: 'Low Stock',
      value: summary?.low_stock_count ?? '—',
      hint: 'Variants at or below the low-stock threshold that need operational attention.',
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
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2 sm:gap-3 lg:justify-end">
              {ranges.map((range) => {
                const active = range.id === activeRange;

                return (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setActiveRange(range.id)}
                    className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] transition sm:text-sm sm:normal-case sm:tracking-normal ${
                      active
                        ? 'bg-white text-stone-950'
                        : 'border border-white/15 text-stone-200 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
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
              href="/admin/inventory"
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:text-white sm:px-4 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
            >
              View inventory
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
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-10 text-center text-sm text-stone-400">
          Loading dashboard metrics…
        </section>
      ) : error || !report || !summary || !statusBreakdown ? (
        <section className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-10 text-center text-sm text-red-300">
          Unable to load reporting data right now.
        </section>
      ) : (
        <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Pending Payment</p>
          <p className="mt-4 text-4xl font-semibold text-white">{summary?.pending_payment_orders ?? '—'}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Unpaid orders still in the action window or awaiting auto-expiry.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Out of Stock</p>
          <p className="mt-4 text-4xl font-semibold text-white">{summary?.out_of_stock_count ?? '—'}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Variants currently unavailable for sale and most likely to affect conversions.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Average Order</p>
          <p className="mt-4 text-4xl font-semibold text-white">
            {formatPrice(summary.average_order_value_minor, summary.currency)}
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Average value of paid orders in the selected reporting range.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Cancelled Orders</p>
          <p className="mt-4 text-4xl font-semibold text-white">{summary.cancelled_orders}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Orders cancelled directly or auto-closed after the payment window.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Order Status</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Operational queue snapshot</h3>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-white/30 hover:text-white"
            >
              Open orders
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Pending Payment', statusBreakdown.pending_payment],
              ['Pending Shipping', statusBreakdown.pending_shipping],
              ['Shipped', statusBreakdown.shipped],
              ['Delivered', statusBreakdown.delivered],
              ['Cancelled', statusBreakdown.cancelled],
              ['Low Stock', summary.low_stock_count],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Inventory Risk</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Current low-stock pressure</h3>
            </div>
            <Link
              href="/admin/inventory"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-white/30 hover:text-white"
            >
              Open inventory
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Low Stock</p>
              <p className="mt-3 text-3xl font-semibold text-white">{summary.low_stock_count}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Out of Stock</p>
              <p className="mt-3 text-3xl font-semibold text-white">{summary.out_of_stock_count}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Top Products</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Best sellers in this range</h3>
            </div>
            <Link
              href="/admin/products"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-white/30 hover:text-white"
            >
              Open products
            </Link>
          </div>

          {report.top_products.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/10 px-6 py-10 text-center text-sm text-stone-400">
              No paid orders are available in this range yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-stone-300">
                <thead className="text-xs uppercase tracking-[0.18em] text-stone-500">
                  <tr>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Units Sold</th>
                    <th className="pb-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {report.top_products.map((product) => (
                    <tr key={`${product.product_id ?? 'snapshot'}-${product.product_name}`}>
                      <td className="py-4 pr-4 text-white">{product.product_name}</td>
                      <td className="py-4 pr-4">{product.units_sold}</td>
                      <td className="py-4">{formatPrice(product.revenue_minor, summary.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Low Stock Variants</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Immediate replenishment watchlist</h3>
            </div>
            <Link
              href="/admin/inventory?tab=low_stock"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-white/30 hover:text-white"
            >
              Review inventory
            </Link>
          </div>

          {report.low_stock_variants.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/10 px-6 py-10 text-center text-sm text-stone-400">
              No low-stock or out-of-stock variants right now.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {report.low_stock_variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{variant.product.name ?? 'Unknown Product'}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{variant.sku}</p>
                      <p className="text-sm text-stone-400">{variant.option_summary}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          variant.stock_state === 'out_of_stock'
                            ? 'bg-rose-400/15 text-rose-200'
                            : 'bg-amber-400/15 text-amber-200'
                        }`}
                      >
                        {stockStateLabel(variant.stock_state)}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">
                        {variant.stock_qty} on hand
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
        </>
      )}
    </div>
  );
}
