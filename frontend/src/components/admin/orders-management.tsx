'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/axios';

type AdminOrderTab =
  | 'all'
  | 'pending_payment'
  | 'pending_shipping'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type OrderAddress = {
  id: string;
  type: 'shipping' | 'billing';
  full_name: string;
  phone: string;
  line_1: string;
  line_2: string | null;
  city: string;
  postal_code: string;
};

type OrderPayment = {
  id: string;
  provider: string;
  provider_reference: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  paid_at: string | null;
};

type OrderShipment = {
  id: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
};

type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  shipping_fee_minor: number;
  total_minor: number;
  placed_at: string;
  shipment: OrderShipment | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
  }>;
  addresses: OrderAddress[];
  payments: OrderPayment[];
};

type OrderResponse = {
  data: AdminOrder[];
};

type FieldErrors = Record<string, string[]>;

const tabs: Array<{ id: AdminOrderTab; label: string }> = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'pending_shipping', label: 'Pending Shipping' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const fetcher = (url: string) => axios.get(url).then((res) => res.data as OrderResponse);

const formatPrice = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minor / 100);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const emptyAddress = {
  full_name: '',
  phone: '',
  line_1: '',
  line_2: '',
  city: '',
  postal_code: '',
};

const emptyShipment = {
  carrier: '',
  tracking_number: '',
  tracking_url: '',
  notes: '',
};

const statusLabel = (order: AdminOrder) => {
  if (order.status === 'delivered') return 'Delivered';
  if (order.status === 'shipped') return 'Shipped';
  if (order.status === 'processing') return 'Pending Shipping';
  if (order.status === 'pending') return 'Pending Payment';
  return 'Cancelled';
};

const addressByType = (order: AdminOrder, type: 'shipping' | 'billing') =>
  order.addresses.find((address) => address.type === type);

const shipmentStatusLabel = (order: AdminOrder) => {
  if (order.shipment?.status === 'delivered') return 'Delivered';
  if (order.shipment?.status === 'shipped') return 'In Transit';
  return 'Pending';
};

export function OrdersManagement() {
  const [activeTab, setActiveTab] = useState<AdminOrderTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);
  const [isSavingAddresses, setIsSavingAddresses] = useState(false);
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [isSavingShipment, setIsSavingShipment] = useState(false);
  const [addressErrors, setAddressErrors] = useState<FieldErrors>({});
  const [shipmentErrors, setShipmentErrors] = useState<FieldErrors>({});
  const [shippingAddress, setShippingAddress] = useState(emptyAddress);
  const [billingAddress, setBillingAddress] = useState(emptyAddress);
  const [shipmentForm, setShipmentForm] = useState(emptyShipment);
  const [nowMs, setNowMs] = useState(Date.now());

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);

    if (searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim());
    }

    return `/api/admin/orders?${params.toString()}`;
  }, [activeTab, searchQuery]);

  const { data, error, isLoading, mutate } = useSWR(query, fetcher);
  const orders = data?.data ?? [];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
      return;
    }

    if (selectedOrderId && !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.id ?? null);
    }
  }, [orders, selectedOrderId]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const pendingCountdown = selectedOrder?.status === 'pending' && selectedOrder.payment_status === 'unpaid'
    ? Math.max(new Date(selectedOrder.placed_at).getTime() + (10 * 60 * 1000) - nowMs, 0)
    : null;

  useEffect(() => {
    if (!selectedOrder || isEditingAddresses) {
      return;
    }

    const shipping = addressByType(selectedOrder, 'shipping');
    const billing = addressByType(selectedOrder, 'billing');

    setShippingAddress({
      full_name: shipping?.full_name ?? '',
      phone: shipping?.phone ?? '',
      line_1: shipping?.line_1 ?? '',
      line_2: shipping?.line_2 ?? '',
      city: shipping?.city ?? '',
      postal_code: shipping?.postal_code ?? '',
    });

    setBillingAddress({
      full_name: billing?.full_name ?? '',
      phone: billing?.phone ?? '',
      line_1: billing?.line_1 ?? '',
      line_2: billing?.line_2 ?? '',
      city: billing?.city ?? '',
      postal_code: billing?.postal_code ?? '',
    });
  }, [isEditingAddresses, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder || isEditingShipment) {
      return;
    }

    setShipmentForm({
      carrier: selectedOrder.shipment?.carrier ?? '',
      tracking_number: selectedOrder.shipment?.tracking_number ?? '',
      tracking_url: selectedOrder.shipment?.tracking_url ?? '',
      notes: selectedOrder.shipment?.notes ?? '',
    });
  }, [isEditingShipment, selectedOrder]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const updateStatus = async (orderId: string, status: 'cancelled') => {
    setActionOrderId(orderId);
    setMessage(null);
    setDetailError(null);

    try {
      await axios.get('/sanctum/csrf-cookie');
      const response = await axios.patch(`/api/admin/orders/${orderId}/status`, { status });
      setMessage(response.data.message ?? 'Order updated.');
      await mutate();
    } catch (error: any) {
      setDetailError(error?.response?.data?.message ?? 'Unable to update the order right now.');
    } finally {
      setActionOrderId(null);
    }
  };

  const saveShipment = async (orderId: string, status: 'shipped' | 'delivered') => {
    setIsSavingShipment(true);
    setShipmentErrors({});
    setDetailError(null);
    setMessage(null);

    try {
      await axios.get('/sanctum/csrf-cookie');
      const response = await axios.patch(`/api/admin/orders/${orderId}/shipment`, {
        ...shipmentForm,
        status,
      });
      setMessage(response.data.message ?? 'Shipment updated.');
      setIsEditingShipment(false);
      await mutate();
    } catch (error: any) {
      setShipmentErrors(error?.response?.data?.errors ?? {});
      setDetailError(error?.response?.data?.message ?? 'Unable to update shipment right now.');
    } finally {
      setIsSavingShipment(false);
    }
  };

  const saveAddresses = async (orderId: string) => {
    setIsSavingAddresses(true);
    setAddressErrors({});
    setDetailError(null);
    setMessage(null);

    try {
      await axios.get('/sanctum/csrf-cookie');
      const response = await axios.patch(`/api/admin/orders/${orderId}/addresses`, {
        shipping_address: shippingAddress,
        billing_address: billingAddress,
      });
      setMessage(response.data.message ?? 'Order addresses updated.');
      setIsEditingAddresses(false);
      await mutate();
    } catch (error: any) {
      setAddressErrors(error?.response?.data?.errors ?? {});
      setDetailError(error?.response?.data?.message ?? 'Unable to update order addresses right now.');
    } finally {
      setIsSavingAddresses(false);
    }
  };

  const renderAddressFields = (
    label: string,
    value: typeof emptyAddress,
    onChange: (next: typeof emptyAddress) => void,
    prefix: 'shipping_address' | 'billing_address',
  ) => (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-stone-950/40 p-4">
      <p className="text-sm font-medium text-white">{label}</p>
      {(['full_name', 'phone', 'line_1', 'line_2', 'city', 'postal_code'] as const).map((field) => (
        <label key={field} className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-stone-500">{field.replace('_', ' ')}</span>
          <input
            value={value[field] ?? ''}
            onChange={(event) => onChange({ ...value, [field]: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
          />
          {addressErrors[`${prefix}.${field}`]?.[0] && (
            <p className="text-xs text-red-300">{addressErrors[`${prefix}.${field}`][0]}</p>
          )}
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-300">Order Management</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Review and fulfill customer orders.</h2>
            <p className="text-sm leading-6 text-stone-300">
              Track payments, move paid orders into shipment, and keep order snapshot addresses accurate for fulfillment.
            </p>
          </div>

          <form onSubmit={submitSearch} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by order number, customer name, or email"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeTab === tab.id
                  ? 'bg-white text-stone-950'
                  : 'border border-white/10 text-stone-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Orders</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Queue</h3>
          </div>

          {isLoading ? (
            <div className="px-6 py-10 text-stone-300">Loading orders…</div>
          ) : error ? (
            <div className="px-6 py-10 text-red-200">Failed to load orders.</div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-10 text-stone-400">No orders match this view yet.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setIsEditingAddresses(false);
                    setIsEditingShipment(false);
                    setDetailError(null);
                  }}
                  className={`flex w-full flex-col gap-3 px-6 py-5 text-left transition hover:bg-white/5 ${
                    selectedOrderId === order.id ? 'bg-white/8' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{order.order_number}</p>
                      <p className="mt-1 truncate text-sm text-stone-400">{order.user.name} · {order.user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatPrice(order.total_minor, order.currency)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{statusLabel(order)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-400">
                    <span>Placed {formatDate(order.placed_at)}</span>
                    <span>Items {order.items.length}</span>
                    <span>Payment {order.payment_status}</span>
                    <span>Shipment {shipmentStatusLabel(order)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          {selectedOrder ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Selected Order</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{selectedOrder.order_number}</h3>
                  <p className="mt-2 text-sm text-stone-400">
                    {selectedOrder.user.name} · {selectedOrder.user.email}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-white">{statusLabel(selectedOrder)}</p>
                  <p className="mt-1 text-sm text-stone-400">Payment {selectedOrder.payment_status}</p>
                </div>
              </div>

              {(message || detailError) && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                  detailError
                    ? 'border-red-500/20 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {detailError ?? message}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Placed</p>
                  <p className="mt-2 text-sm text-white">{formatDate(selectedOrder.placed_at)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Total</p>
                  <p className="mt-2 text-sm text-white">{formatPrice(selectedOrder.total_minor, selectedOrder.currency)}</p>
                </div>
              </div>

              {pendingCountdown !== null && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Payment window remaining: {formatRemaining(pendingCountdown)}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {selectedOrder.status === 'processing' && selectedOrder.payment_status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingShipment(true);
                      setShipmentErrors({});
                      setDetailError(null);
                    }}
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:opacity-60"
                  >
                    Prepare shipment
                  </button>
                )}
                {selectedOrder.status === 'shipped' && selectedOrder.payment_status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => saveShipment(selectedOrder.id, 'delivered')}
                    disabled={isSavingShipment}
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:opacity-60"
                  >
                    {isSavingShipment ? 'Updating…' : 'Mark as delivered'}
                  </button>
                )}
                {selectedOrder.status === 'pending' && selectedOrder.payment_status === 'unpaid' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                    disabled={actionOrderId === selectedOrder.id}
                    className="rounded-full border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:opacity-60"
                  >
                    {actionOrderId === selectedOrder.id ? 'Cancelling…' : 'Cancel order'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAddresses((current) => !current);
                    setIsEditingShipment(false);
                    setAddressErrors({});
                    setDetailError(null);
                  }}
                  className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                >
                  {isEditingAddresses ? 'Close address editor' : 'Edit addresses'}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Items</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.product_name}</p>
                          <p className="mt-1 text-sm text-stone-400">{item.sku}</p>
                        </div>
                        <div className="text-right text-sm text-stone-300">
                          <p>{formatPrice(item.line_total_minor, selectedOrder.currency)}</p>
                          <p className="mt-1 text-stone-500">Qty {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Shipment</p>
                  {(selectedOrder.status === 'processing' || selectedOrder.status === 'shipped') && selectedOrder.payment_status === 'paid' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingShipment((current) => !current);
                        setShipmentErrors({});
                        setDetailError(null);
                        setIsEditingAddresses(false);
                      }}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                    >
                      {isEditingShipment ? 'Close shipment editor' : 'Edit shipment'}
                    </button>
                  )}
                </div>

                {!isEditingShipment ? (
                  selectedOrder.shipment ? (
                    <div className="mt-3 space-y-2 text-sm text-stone-300">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Status</span>
                        <span className="font-medium text-white">{shipmentStatusLabel(selectedOrder)}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Carrier</span>
                        <span>{selectedOrder.shipment.carrier}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Tracking Number</span>
                        <span>{selectedOrder.shipment.tracking_number}</span>
                      </div>
                      {selectedOrder.shipment.tracking_url && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>Tracking URL</span>
                          <a
                            href={selectedOrder.shipment.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white underline decoration-stone-500 underline-offset-4 transition hover:text-stone-300"
                          >
                            Open tracking
                          </a>
                        </div>
                      )}
                      {selectedOrder.shipment.shipped_at && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>Shipped At</span>
                          <span>{formatDate(selectedOrder.shipment.shipped_at)}</span>
                        </div>
                      )}
                      {selectedOrder.shipment.delivered_at && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>Delivered At</span>
                          <span>{formatDate(selectedOrder.shipment.delivered_at)}</span>
                        </div>
                      )}
                      {selectedOrder.shipment.notes && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                          {selectedOrder.shipment.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-stone-400">No shipment data yet. Add carrier and tracking details before dispatch.</p>
                  )
                ) : (
                  <div className="mt-4 space-y-3">
                    {(['carrier', 'tracking_number', 'tracking_url', 'notes'] as const).map((field) => (
                      <label key={field} className="block space-y-1">
                        <span className="text-xs uppercase tracking-[0.18em] text-stone-500">{field.replace('_', ' ')}</span>
                        {field === 'notes' ? (
                          <textarea
                            value={shipmentForm[field]}
                            onChange={(event) => setShipmentForm((current) => ({ ...current, [field]: event.target.value }))}
                            className="min-h-24 w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                          />
                        ) : (
                          <input
                            value={shipmentForm[field]}
                            onChange={(event) => setShipmentForm((current) => ({ ...current, [field]: event.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
                          />
                        )}
                        {shipmentErrors[field]?.[0] && (
                          <p className="text-xs text-red-300">{shipmentErrors[field][0]}</p>
                        )}
                      </label>
                    ))}

                    <div className="flex flex-wrap gap-3">
                      {selectedOrder.status === 'processing' && (
                        <button
                          type="button"
                          onClick={() => saveShipment(selectedOrder.id, 'shipped')}
                          disabled={isSavingShipment}
                          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:opacity-60"
                        >
                          {isSavingShipment ? 'Saving…' : 'Save and mark shipped'}
                        </button>
                      )}
                      {selectedOrder.status === 'shipped' && (
                        <button
                          type="button"
                          onClick={() => saveShipment(selectedOrder.id, 'delivered')}
                          disabled={isSavingShipment}
                          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:opacity-60"
                        >
                          {isSavingShipment ? 'Saving…' : 'Save and mark delivered'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {!isEditingAddresses ? (
                  <>
                    {(['shipping', 'billing'] as const).map((type) => {
                      const address = addressByType(selectedOrder, type);

                      return (
                        <div key={type} className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{type} address</p>
                          <div className="mt-3 space-y-1 text-sm text-stone-300">
                            <p className="font-medium text-white">{address?.full_name ?? '—'}</p>
                            <p>{address?.phone ?? '—'}</p>
                            <p>{address?.line_1 ?? '—'}</p>
                            {address?.line_2 && <p>{address.line_2}</p>}
                            <p>{address?.city ?? '—'}</p>
                            <p>{address?.postal_code ?? '—'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {renderAddressFields('Shipping address', shippingAddress, setShippingAddress, 'shipping_address')}
                    {renderAddressFields('Billing address', billingAddress, setBillingAddress, 'billing_address')}
                  </>
                )}
              </div>

              {isEditingAddresses && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => saveAddresses(selectedOrder.id)}
                    disabled={isSavingAddresses}
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:opacity-60"
                  >
                    {isSavingAddresses ? 'Saving…' : 'Save addresses'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAddresses(false);
                      setAddressErrors({});
                      setDetailError(null);
                    }}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Payment</p>
                {selectedOrder.payments.length ? (
                  <div className="mt-3 space-y-2 text-sm text-stone-300">
                    {selectedOrder.payments.map((payment) => (
                      <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3">
                        <span>{payment.provider}</span>
                        <span>{payment.status}</span>
                        <span>{formatPrice(payment.amount_minor, payment.currency)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">No payment records found.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-stone-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Totals</p>
                <div className="mt-3 space-y-2 text-sm text-stone-300">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal_minor, selectedOrder.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span>{formatPrice(selectedOrder.discount_minor, selectedOrder.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>{formatPrice(selectedOrder.tax_minor, selectedOrder.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span>{formatPrice(selectedOrder.shipping_fee_minor, selectedOrder.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 font-medium text-white">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.total_minor, selectedOrder.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-stone-400">Select an order to review details.</div>
          )}
        </div>
      </section>
    </div>
  );
}
