'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/axios';

type InventoryTab = 'all' | 'low_stock' | 'out_of_stock';
type InventoryAction = 'set' | 'increment' | 'decrement';
type InventoryReason = 'manual_adjustment' | 'restock' | 'damage' | 'correction';

type InventoryMovement = {
  id: string;
  reason: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  created_at: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  order: {
    id: string;
    order_number: string;
  } | null;
};

type InventoryVariant = {
  id: string;
  sku: string;
  stock_qty: number;
  status: string;
  stock_state: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  latest_movement_at: string | null;
  product: {
    id: string;
    name: string;
  };
  option_values: Array<{
    id: string;
    value: string;
    option_type: string | null;
  }>;
  inventory_movements: InventoryMovement[];
};

type InventoryListResponse = {
  data: InventoryVariant[];
  meta: {
    total: number;
    low_stock_count: number;
    out_of_stock_count: number;
    low_stock_threshold: number;
  };
};

type InventoryDetailResponse = {
  data: InventoryVariant;
};

type FieldErrors = Record<string, string[]>;

const tabs: Array<{ id: InventoryTab; label: string }> = [
  { id: 'all', label: 'All Stock' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'out_of_stock', label: 'Out of Stock' },
];

const reasons: Array<{ value: InventoryReason; label: string }> = [
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'restock', label: 'Restock' },
  { value: 'damage', label: 'Damage' },
  { value: 'correction', label: 'Correction' },
];

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const stockStateLabel = (state: InventoryVariant['stock_state']) => {
  switch (state) {
    case 'low_stock':
      return 'Low Stock';
    case 'out_of_stock':
      return 'Out of Stock';
    default:
      return 'In Stock';
  }
};

const movementReasonLabel = (reason: string) =>
  reason
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const optionSummary = (variant: InventoryVariant) =>
  variant.option_values.length > 0
    ? variant.option_values
        .map((option) => `${option.option_type ?? 'Option'}: ${option.value}`)
        .join(' / ')
    : 'No option values';

export function InventoryManagement() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [action, setAction] = useState<InventoryAction>('increment');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<InventoryReason>('restock');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);

    if (searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim());
    }

    return `/api/admin/inventory?${params.toString()}`;
  }, [activeTab, searchQuery]);

  const { data, error, isLoading, mutate } = useSWR<InventoryListResponse>(query, fetcher);
  const variants = data?.data ?? [];
  const meta = data?.meta;

  useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      setSelectedVariantId(variants[0].id);
      return;
    }

    if (selectedVariantId && !variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(variants[0]?.id ?? null);
    }
  }, [selectedVariantId, variants]);

  const detailQuery = selectedVariantId ? `/api/admin/inventory/${selectedVariantId}` : null;
  const {
    data: detailData,
    isLoading: isLoadingDetail,
    mutate: mutateDetail,
  } = useSWR<InventoryDetailResponse>(detailQuery, fetcher);

  const selectedVariant = detailData?.data ?? variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const submitAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedVariant) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      await axios.get('/sanctum/csrf-cookie');
      const response = await axios.post(`/api/admin/inventory/${selectedVariant.id}/adjust`, {
        action,
        quantity: Number(quantity),
        reason,
      });

      setMessage(response.data.message ?? 'Inventory updated.');

      await Promise.all([
        mutate(),
        mutateDetail(),
      ]);

      if (action === 'increment' || action === 'decrement') {
        setQuantity('1');
      }
    } catch (error: any) {
      setFieldErrors(error?.response?.data?.errors ?? {});
      setErrorMessage(error?.response?.data?.message ?? 'Unable to adjust inventory right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400">Inventory</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Keep stock changes auditable.</h2>
            <p className="text-sm leading-6 text-stone-300">
              Review stock pressure, adjust variant inventory safely, and inspect every reservation, restore, and manual correction from one queue.
            </p>
          </div>
          <form onSubmit={submitSearch} className="flex w-full max-w-xl gap-3">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by product name or SKU"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-stone-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-white/30"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Variants</p>
          <p className="mt-4 text-4xl font-semibold text-white">{meta?.total ?? '—'}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">All product variants currently tracked in inventory.</p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Low Stock</p>
          <p className="mt-4 text-4xl font-semibold text-white">{meta?.low_stock_count ?? '—'}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Variants at or below {meta?.low_stock_threshold ?? 5} units and still sellable.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-stone-950/70 p-6 shadow-lg shadow-black/10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Out of Stock</p>
          <p className="mt-4 text-4xl font-semibold text-white">{meta?.out_of_stock_count ?? '—'}</p>
          <p className="mt-3 text-sm leading-6 text-stone-400">Variants with zero units left on hand.</p>
        </article>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-stone-950/75 p-4 shadow-xl shadow-black/20 sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active
                        ? 'bg-white text-stone-950'
                        : 'border border-white/10 text-stone-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-stone-400">Loading inventory…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-300">Unable to load inventory right now.</div>
          ) : variants.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-400">No variants matched this inventory view.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {variants.map((variant) => {
                const active = variant.id === selectedVariantId;
                const detailVariant = active ? selectedVariant : null;

                return (
                  <div
                    key={variant.id}
                    className={`rounded-[1.5rem] border transition ${
                      active
                        ? 'border-white/25 bg-white/[0.08]'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVariantId((current) => current === variant.id ? null : variant.id);
                        setMessage(null);
                        setErrorMessage(null);
                        setFieldErrors({});
                      }}
                      className={`w-full p-4 text-left transition ${
                        active ? '' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{variant.product.name}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{variant.sku}</p>
                          </div>
                          <p className="text-sm text-stone-400">{optionSummary(variant)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            variant.stock_state === 'out_of_stock'
                              ? 'bg-rose-400/15 text-rose-200'
                              : variant.stock_state === 'low_stock'
                                ? 'bg-amber-400/15 text-amber-200'
                                : 'bg-emerald-400/15 text-emerald-200'
                          }`}>
                            {stockStateLabel(variant.stock_state)}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200">
                            {variant.stock_qty} units
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-1 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>Variant status: {variant.status}</span>
                        <span>
                          {variant.latest_movement_at
                            ? `Last movement ${formatDate(variant.latest_movement_at)}`
                            : 'No movement history yet'}
                        </span>
                      </div>
                    </button>

                    {active && detailVariant && (
                      <div className="border-t border-white/10 px-4 pb-4 pt-4">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                          <section className="rounded-[1.5rem] border border-white/10 bg-stone-950/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">Movement history</p>
                                <p className="mt-1 text-xs text-stone-500">Latest 25 inventory events for this variant.</p>
                              </div>
                              {isLoadingDetail && <span className="text-xs text-stone-500">Refreshing…</span>}
                            </div>

                            <div className="mt-4 space-y-3">
                              {detailVariant.inventory_movements.length === 0 ? (
                                <p className="text-sm text-stone-400">No inventory movements recorded yet.</p>
                              ) : (
                                detailVariant.inventory_movements.map((movement) => (
                                  <article
                                    key={movement.id}
                                    className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-white">{movementReasonLabel(movement.reason)}</p>
                                        <p className="mt-1 text-xs text-stone-500">{formatDate(movement.created_at)}</p>
                                      </div>
                                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        movement.quantity_delta > 0
                                          ? 'bg-emerald-400/15 text-emerald-200'
                                          : 'bg-rose-400/15 text-rose-200'
                                      }`}>
                                        {movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-400">
                                      <span>Before: <span className="text-stone-100">{movement.quantity_before}</span></span>
                                      <span>After: <span className="text-stone-100">{movement.quantity_after}</span></span>
                                      {movement.actor && (
                                        <span>Actor: <span className="text-stone-100">{movement.actor.name}</span></span>
                                      )}
                                      {movement.order && (
                                        <span>Order: <span className="text-stone-100">{movement.order.order_number}</span></span>
                                      )}
                                    </div>
                                  </article>
                                ))
                              )}
                            </div>
                          </section>

                          <section className="rounded-[1.5rem] border border-white/10 bg-stone-950/70 p-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-stone-100">
                                  {stockStateLabel(detailVariant.stock_state)}
                                </span>
                                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-300">
                                  {detailVariant.stock_qty} units on hand
                                </span>
                              </div>
                              <p className="text-sm leading-6 text-stone-300">{optionSummary(detailVariant)}</p>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">Adjust stock</p>
                                <p className="mt-1 text-xs text-stone-500">Every manual change is recorded with before/after quantities.</p>
                              </div>
                            </div>

                            {message && (
                              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                                {message}
                              </div>
                            )}

                            {errorMessage && (
                              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                                {errorMessage}
                              </div>
                            )}

                            <form onSubmit={submitAdjustment} className="mt-4 space-y-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2 text-sm text-stone-300">
                                  <span>Action</span>
                                  <select
                                    value={action}
                                    onChange={(event) => setAction(event.target.value as InventoryAction)}
                                    className="w-full rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                  >
                                    <option value="set">Set exact stock</option>
                                    <option value="increment">Increase stock</option>
                                    <option value="decrement">Decrease stock</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm text-stone-300">
                                  <span>{action === 'set' ? 'Final quantity' : 'Adjustment amount'}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                  {fieldErrors.quantity?.[0] && (
                                    <p className="text-xs text-rose-300">{fieldErrors.quantity[0]}</p>
                                  )}
                                </label>
                              </div>

                              <label className="space-y-2 text-sm text-stone-300">
                                <span>Reason</span>
                                <select
                                  value={reason}
                                  onChange={(event) => setReason(event.target.value as InventoryReason)}
                                  className="w-full rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                >
                                  {reasons.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                {fieldErrors.reason?.[0] && (
                                  <p className="text-xs text-rose-300">{fieldErrors.reason[0]}</p>
                                )}
                              </label>

                              <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:bg-stone-300"
                              >
                                {isSaving ? 'Saving…' : 'Save adjustment'}
                              </button>
                            </form>
                          </section>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
