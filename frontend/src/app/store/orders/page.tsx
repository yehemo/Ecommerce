'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import type { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import {
  type CheckoutAddressInput,
  type CheckoutOrderResponse,
  type OrdersTab,
  type SavedAddress,
} from '@/components/store/cart-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

type FieldErrors = Record<string, string[]>;
type AddressSection = 'shipping' | 'billing';
type AddressFormValues = CheckoutAddressInput & {
  type: AddressSection;
  is_default: boolean;
};
type AddressEditorState = {
  id: string | null;
  values: AddressFormValues;
};
type ApiErrorPayload = {
  errors?: FieldErrors;
  message?: string;
  data?: CheckoutOrderResponse;
};

const ORDER_ADDRESS_EDIT_WINDOW_MS = 10 * 60 * 1000;
const tabs: Array<{ id: OrdersTab; label: string }> = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'pending_shipping', label: 'Pending Shipping' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const emptyAddress = (): CheckoutAddressInput => ({
  full_name: '',
  phone: '',
  line_1: '',
  line_2: '',
  city: '',
  postal_code: '',
});

const emptyAddressForm = (): AddressFormValues => ({
  ...emptyAddress(),
  type: 'shipping',
  is_default: false,
});

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

const toAddressFormValues = (address: SavedAddress): AddressFormValues => ({
  full_name: address.full_name,
  phone: address.phone,
  line_1: address.line_1,
  line_2: address.line_2,
  city: address.city,
  postal_code: address.postal_code,
  type: address.type,
  is_default: address.is_default,
});

const toOrderAddressInput = (order: CheckoutOrderResponse, type: AddressSection): CheckoutAddressInput => {
  const address = order.addresses.find((entry) => entry.type === type);

  return {
    full_name: address?.full_name ?? '',
    phone: address?.phone ?? '',
    line_1: address?.line_1 ?? '',
    line_2: address?.line_2 ?? '',
    city: address?.city ?? '',
    postal_code: address?.postal_code ?? '',
  };
};

const paymentBadgeVariant = (order: CheckoutOrderResponse) => {
  if (order.payment_status === 'paid') {
    return 'default';
  }

  if (order.payment_status === 'cancelled') {
    return 'destructive';
  }

  return 'outline';
};

const statusLabel = (order: CheckoutOrderResponse) => {
  if (order.status === 'delivered' && order.payment_status === 'paid') {
    return 'Delivered';
  }

  if (order.status === 'shipped' && order.payment_status === 'paid') {
    return 'Shipped';
  }

  if (order.status === 'processing' && order.payment_status === 'paid') {
    return 'Pending Shipping';
  }

  if (order.status === 'pending' && order.payment_status === 'unpaid') {
    return 'Pending Payment';
  }

  if (order.status === 'cancelled') {
    return 'Cancelled';
  }

  return order.status.replace('_', ' ');
};

const shipmentLabel = (order: CheckoutOrderResponse) => {
  if (order.shipment?.status === 'delivered') {
    return 'Delivered';
  }

  if (order.shipment?.status === 'shipped') {
    return 'In Transit';
  }

  return 'Awaiting Shipment';
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, error: authError } = useAuth({});

  const [activeTab, setActiveTab] = useState<OrdersTab>('all');
  const [orders, setOrders] = useState<CheckoutOrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderActionId, setOrderActionId] = useState<string | null>(null);
  const [isUpdatingOrderAddresses, setIsUpdatingOrderAddresses] = useState(false);
  const [orderAddressErrors, setOrderAddressErrors] = useState<FieldErrors>({});
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [editedShippingAddress, setEditedShippingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [editedBillingAddress, setEditedBillingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [editedBillingSameAsShipping, setEditedBillingSameAsShipping] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [addressEditor, setAddressEditor] = useState<AddressEditorState | null>(null);
  const [addressEditorErrors, setAddressEditorErrors] = useState<FieldErrors>({});
  const [addressEditorMessage, setAddressEditorMessage] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressActionId, setAddressActionId] = useState<string | null>(null);

  const visibleOrders = useMemo(() => orders, [orders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && authError) {
      router.replace('/store/login?next=/store/orders');
    }
  }, [authError, authLoading, router, user]);

  const loadSavedAddresses = async () => {
    setAddressesLoading(true);
    setAddressesError(null);

    try {
      const response = await axios.get('/api/addresses');
      setSavedAddresses(response.data.data as SavedAddress[]);
    } catch (error) {
      console.error(error);
      setAddressesError('Unable to load saved addresses right now.');
    } finally {
      setAddressesLoading(false);
    }
  };

  const loadOrders = async (tab: OrdersTab) => {
    setOrdersLoading(true);
    setOrdersError(null);

    try {
      const response = await axios.get('/api/orders', {
        params: { tab },
      });

      const nextOrders = response.data.data as CheckoutOrderResponse[];
      setOrders(nextOrders);

      if (expandedOrderId && !nextOrders.some((order) => order.id === expandedOrderId)) {
        setExpandedOrderId(null);
      }

      if (editingOrderId && !nextOrders.some((order) => order.id === editingOrderId)) {
        setEditingOrderId(null);
      }
    } catch (error) {
      console.error(error);
      setOrdersError('Unable to load your orders right now.');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setSavedAddresses([]);
      setOrdersLoading(false);
      setAddressesLoading(false);
      return;
    }

    void loadSavedAddresses();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadOrders(activeTab);
  }, [activeTab, user]);

  useEffect(() => {
    if (editedBillingSameAsShipping) {
      setEditedBillingAddress(editedShippingAddress);
    }
  }, [editedBillingSameAsShipping, editedShippingAddress]);

  const openNewAddressEditor = (type: AddressSection = 'shipping') => {
    setAddressEditor({
      id: null,
      values: {
        ...emptyAddressForm(),
        type,
      },
    });
    setAddressEditorErrors({});
    setAddressEditorMessage(null);
  };

  const openEditAddressEditor = (address: SavedAddress) => {
    setAddressEditor({
      id: address.id,
      values: toAddressFormValues(address),
    });
    setAddressEditorErrors({});
    setAddressEditorMessage(null);
  };

  const saveAddress = async () => {
    if (!addressEditor) {
      return;
    }

    setIsSavingAddress(true);
    setAddressEditorErrors({});
    setAddressEditorMessage(null);

    try {
      if (addressEditor.id) {
        await axios.patch(`/api/addresses/${addressEditor.id}`, addressEditor.values);
      } else {
        await axios.post('/api/addresses', addressEditor.values);
      }

      await loadSavedAddresses();
      setAddressEditor(null);
      setAddressEditorMessage(null);
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;

      if (response?.status === 422 && response.data?.errors) {
        setAddressEditorErrors(response.data.errors);
      } else {
        setAddressEditorMessage(response?.data?.message ?? 'Unable to save this address right now.');
      }
    } finally {
      setIsSavingAddress(false);
    }
  };

  const updateAddressDefault = async (address: SavedAddress) => {
    setAddressActionId(address.id);

    try {
      await axios.patch(`/api/addresses/${address.id}`, {
        is_default: true,
      });
      await loadSavedAddresses();
    } catch (error) {
      console.error(error);
      setAddressesError('Unable to update the default address right now.');
    } finally {
      setAddressActionId(null);
    }
  };

  const deleteAddress = async (addressId: string) => {
    setAddressActionId(addressId);

    try {
      await axios.delete(`/api/addresses/${addressId}`);
      await loadSavedAddresses();
    } catch (error) {
      console.error(error);
      setAddressesError('Unable to remove this address right now.');
    } finally {
      setAddressActionId(null);
    }
  };

  const toggleExpandedOrder = (order: CheckoutOrderResponse) => {
    setOrderMessage(null);
    setExpandedOrderId((current) => current === order.id ? null : order.id);

    if (expandedOrderId === order.id) {
      setEditingOrderId(null);
    }
  };

  const startEditingOrderAddresses = (order: CheckoutOrderResponse) => {
    const shipping = toOrderAddressInput(order, 'shipping');
    const billing = toOrderAddressInput(order, 'billing');
    const sameAsShipping = JSON.stringify(shipping) === JSON.stringify(billing);

    setEditingOrderId(order.id);
    setExpandedOrderId(order.id);
    setEditedShippingAddress(shipping);
    setEditedBillingAddress(billing);
    setEditedBillingSameAsShipping(sameAsShipping);
    setOrderAddressErrors({});
    setOrderMessage(null);
  };

  const replaceOrderInState = (nextOrder: CheckoutOrderResponse) => {
    setOrders((current) => {
      const updated = current.map((order) => order.id === nextOrder.id ? nextOrder : order);
      return updated;
    });
  };

  const saveOrderAddresses = async (orderId: string) => {
    setIsUpdatingOrderAddresses(true);
    setOrderAddressErrors({});
    setOrderMessage(null);

    try {
      const response = await axios.patch(`/api/orders/${orderId}/addresses`, {
        shipping_address: editedShippingAddress,
        billing_address: editedBillingSameAsShipping ? editedShippingAddress : editedBillingAddress,
      });

      const updatedOrder = response.data.data as CheckoutOrderResponse;
      replaceOrderInState(updatedOrder);
      setEditingOrderId(null);
      setOrderMessage(response.data.message ?? 'Order addresses updated successfully.');
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;

      if (response?.status === 422 && response.data?.errors) {
        setOrderAddressErrors(response.data.errors);
      } else {
        setOrderMessage(response?.data?.message ?? 'Unable to update order addresses right now.');

        if (response?.data?.data) {
          replaceOrderInState(response.data.data);
        }
      }
    } finally {
      setIsUpdatingOrderAddresses(false);
    }
  };

  const submitOrderAction = async (orderId: string, action: 'pay' | 'cancel') => {
    setOrderActionId(orderId);
    setOrderMessage(null);

    try {
      const response = await axios.post(`/api/orders/${orderId}/${action}`);
      const updatedOrder = response.data.data as CheckoutOrderResponse;

      replaceOrderInState(updatedOrder);
      setEditingOrderId(null);
      setOrderMessage(response.data.message ?? (action === 'pay' ? 'Order marked as paid.' : 'Order cancelled.'));

      await loadOrders(activeTab);
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;
      setOrderMessage(response?.data?.message ?? 'Unable to update this order right now.');

      if (response?.data?.data) {
        replaceOrderInState(response.data.data);
      }
    } finally {
      setOrderActionId(null);
    }
  };

  if (!authLoading && !user) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
          <div>
            <h1 className="text-3xl font-light tracking-[0.12em] text-black uppercase">My Orders</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-500">
              Manage your saved checkout addresses and review every order from your account in one place.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-black">Saved Addresses</h2>
            <p className="text-sm text-stone-500">
              These are reusable account addresses for future checkouts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openNewAddressEditor('shipping')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipping
            </Button>
            <Button variant="outline" size="sm" onClick={() => openNewAddressEditor('billing')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Billing
            </Button>
          </div>
        </div>

        {addressesError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {addressesError}
          </div>
        )}

        {addressEditor && (
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle>{addressEditor.id ? 'Edit saved address' : 'Add saved address'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressEditorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {addressEditorMessage}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address-type">Address type</Label>
                  <select
                    id="address-type"
                    value={addressEditor.values.type}
                    onChange={(event) => setAddressEditor((current) => current ? {
                      ...current,
                      values: {
                        ...current.values,
                        type: event.target.value as AddressSection,
                      },
                    } : current)}
                    className="flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                  >
                    <option value="shipping">Shipping</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    checked={addressEditor.values.is_default}
                    onChange={(event) => setAddressEditor((current) => current ? {
                      ...current,
                      values: {
                        ...current.values,
                        is_default: event.target.checked,
                      },
                    } : current)}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  Make this the default {addressEditor.values.type} address
                </label>
              </div>

              <AddressFields
                prefix=""
                values={addressEditor.values}
                errors={addressEditorErrors}
                onChange={(field, value) => setAddressEditor((current) => current ? {
                  ...current,
                  values: {
                    ...current.values,
                    [field]: value,
                  },
                } : current)}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => setAddressEditor(null)} disabled={isSavingAddress}>
                Cancel
              </Button>
              <Button onClick={saveAddress} disabled={isSavingAddress}>
                {isSavingAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save address
              </Button>
            </CardFooter>
          </Card>
        )}

        {addressesLoading ? (
          <Card className="border-stone-200">
            <CardContent className="py-8 text-sm text-stone-500">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved addresses...
              </div>
            </CardContent>
          </Card>
        ) : savedAddresses.length === 0 ? (
          <Card className="border-dashed border-stone-300 bg-stone-50/80">
            <CardContent className="py-8 text-sm text-stone-500">
              You have no saved addresses yet. Add one above to reuse it during checkout.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedAddresses.map((address) => (
              <Card key={address.id} className="border-stone-200">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="uppercase">{address.type}</Badge>
                        {address.is_default && <Badge>Default</Badge>}
                      </div>
                      <CardTitle className="text-base">{address.full_name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-stone-600">
                  <p>{address.phone}</p>
                  <p>{address.line_1}</p>
                  {address.line_2 && <p>{address.line_2}</p>}
                  <p>{address.city} {address.postal_code}</p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditAddressEditor(address)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAddressDefault(address)}
                        disabled={addressActionId === address.id}
                      >
                        {addressActionId === address.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Set default
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAddress(address.id)}
                    disabled={addressActionId === address.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    {addressActionId === address.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-black">Order Activity</h2>
          <p className="text-sm text-stone-500">
            Switch between order states and expand any order to review items, totals, payment, and address snapshots.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {ordersError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ordersError}
          </div>
        )}

        {orderMessage && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            {orderMessage}
          </div>
        )}

        {ordersLoading ? (
          <Card className="border-stone-200">
            <CardContent className="py-8 text-sm text-stone-500">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders...
              </div>
            </CardContent>
          </Card>
        ) : visibleOrders.length === 0 ? (
          <Card className="border-dashed border-stone-300 bg-stone-50/80">
            <CardContent className="py-10 text-center">
              <Package className="mx-auto mb-4 h-10 w-10 text-stone-300" />
              <h3 className="text-base font-medium text-black">No orders in this tab yet</h3>
              <p className="mt-2 text-sm text-stone-500">
                Start shopping to create your first order, or switch tabs to review other order states.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const expanded = expandedOrderId === order.id;
              const editingAddresses = editingOrderId === order.id;
              const placedAtMs = new Date(order.placed_at).getTime();
              const remainingMs = placedAtMs + ORDER_ADDRESS_EDIT_WINDOW_MS - nowMs;
              const withinActionWindow = remainingMs > 0;
              const payment = order.payments[0] ?? null;
              const canManageOrder = order.status === 'pending'
                && order.payment_status === 'unpaid'
                && payment?.status === 'pending'
                && withinActionWindow;

              return (
                <Card key={order.id} className="border-stone-200">
                  <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{statusLabel(order)}</Badge>
                          <Badge variant={paymentBadgeVariant(order)}>
                            Payment {order.payment_status}
                          </Badge>
                          {canManageOrder && (
                            <Badge variant="outline" className="gap-1">
                              <Clock3 className="h-3 w-3" />
                              {formatRemaining(remainingMs)} left
                            </Badge>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                          <p className="mt-1 text-sm text-stone-500">
                            Placed {formatDate(order.placed_at)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-3 lg:min-w-[24rem]">
                        <SummaryMetric label="Items" value={`${order.items.reduce((sum, item) => sum + item.quantity, 0)} total`} />
                        <SummaryMetric label="Order total" value={formatPrice(order.total_minor, order.currency)} />
                        <SummaryMetric label="Payment" value={order.payment_status} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardFooter className="justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {canManageOrder && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => submitOrderAction(order.id, 'pay')}
                            disabled={orderActionId === order.id}
                          >
                            {orderActionId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Pay now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => submitOrderAction(order.id, 'cancel')}
                            disabled={orderActionId === order.id}
                          >
                            Cancel order
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditingOrderAddresses(order)}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Edit addresses
                          </Button>
                        </>
                      )}
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => toggleExpandedOrder(order)}>
                      {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                      {expanded ? 'Hide details' : 'View details'}
                    </Button>
                  </CardFooter>

                  {expanded && (
                    <CardContent className="space-y-6 border-t border-stone-100 pt-6">
                      {editingAddresses && (
                        <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-sm font-medium text-black">Edit order snapshot addresses</h3>
                              <p className="text-sm text-stone-500">
                                These edits affect this order only and stay separate from your saved account addresses.
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setEditingOrderId(null)}>
                              Cancel
                            </Button>
                          </div>

                          <AddressFields
                            title="Shipping address"
                            prefix="shipping_address"
                            values={editedShippingAddress}
                            errors={orderAddressErrors}
                            onChange={(field, value) => setEditedShippingAddress((current) => ({ ...current, [field]: value }))}
                          />

                          <label className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
                            <input
                              type="checkbox"
                              checked={editedBillingSameAsShipping}
                              onChange={(event) => setEditedBillingSameAsShipping(event.target.checked)}
                              className="h-4 w-4 rounded border-stone-300"
                            />
                            Billing address is the same as shipping
                          </label>

                          {!editedBillingSameAsShipping && (
                            <AddressFields
                              title="Billing address"
                              prefix="billing_address"
                              values={editedBillingAddress}
                              errors={orderAddressErrors}
                              onChange={(field, value) => setEditedBillingAddress((current) => ({ ...current, [field]: value }))}
                            />
                          )}

                          <div className="flex justify-end">
                            <Button onClick={() => saveOrderAddresses(order.id)} disabled={isUpdatingOrderAddresses}>
                              {isUpdatingOrderAddresses ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Save order addresses
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-stone-500">Items</h3>
                            <div className="space-y-3">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 px-4 py-3"
                                >
                                  <div className="space-y-1">
                                    <p className="font-medium text-black">{item.product_name}</p>
                                    <p className="text-sm text-stone-500">SKU {item.sku}</p>
                                    <p className="text-sm text-stone-500">Quantity {item.quantity}</p>
                                  </div>
                                  <p className="text-sm font-medium text-black">
                                    {formatPrice(item.line_total_minor, order.currency)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {(['shipping', 'billing'] as AddressSection[]).map((type) => {
                              const address = order.addresses.find((entry) => entry.type === type);

                              return (
                                <div key={type} className="rounded-2xl border border-stone-200 p-4">
                                  <div className="mb-3 flex items-center gap-2">
                                    <Badge variant="outline" className="uppercase">{type}</Badge>
                                  </div>
                                  {address ? (
                                    <div className="space-y-1 text-sm text-stone-600">
                                      <p className="font-medium text-black">{address.full_name}</p>
                                      <p>{address.phone}</p>
                                      <p>{address.line_1}</p>
                                      {address.line_2 && <p>{address.line_2}</p>}
                                      <p>{address.city} {address.postal_code}</p>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-stone-500">No {type} address snapshot found.</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-stone-200 p-4">
                          <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-stone-500">Order Summary</h3>
                          <SummaryRow label="Subtotal" value={formatPrice(order.subtotal_minor, order.currency)} />
                          <SummaryRow label="Discount" value={formatPrice(order.discount_minor, order.currency)} />
                          <SummaryRow label="Tax" value={formatPrice(order.tax_minor, order.currency)} />
                          <SummaryRow label="Shipping" value={formatPrice(order.shipping_fee_minor, order.currency)} />
                          <Separator />
                          <SummaryRow label="Total" value={formatPrice(order.total_minor, order.currency)} emphasized />

                          {payment && (
                            <>
                              <Separator />
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-500">Payment provider</span>
                                  <span className="font-medium text-black">{payment.provider}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-500">Payment status</span>
                                  <span className="font-medium text-black">{payment.status}</span>
                                </div>
                                {payment.paid_at && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-stone-500">Paid at</span>
                                    <span className="font-medium text-black">{formatDate(payment.paid_at)}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          <Separator />
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-500">Shipment</span>
                              <span className="font-medium text-black">{shipmentLabel(order)}</span>
                            </div>
                            {order.shipment ? (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-stone-500">Carrier</span>
                                  <span className="font-medium text-black">{order.shipment.carrier}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-stone-500">Tracking number</span>
                                  <span className="font-medium text-black">{order.shipment.tracking_number}</span>
                                </div>
                                {order.shipment.tracking_url && (
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-stone-500">Tracking link</span>
                                    <a
                                      href={order.shipment.tracking_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-black underline decoration-stone-400 underline-offset-4 transition hover:text-stone-600"
                                    >
                                      Track package
                                    </a>
                                  </div>
                                )}
                                {order.shipment.shipped_at && (
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-stone-500">Shipped at</span>
                                    <span className="font-medium text-black">{formatDate(order.shipment.shipped_at)}</span>
                                  </div>
                                )}
                                {order.shipment.delivered_at && (
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-stone-500">Delivered at</span>
                                    <span className="font-medium text-black">{formatDate(order.shipment.delivered_at)}</span>
                                  </div>
                                )}
                                {order.shipment.notes && (
                                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-600">
                                    {order.shipment.notes}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-stone-500">Shipment details will appear here once the order is dispatched.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-black">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={emphasized ? 'font-medium text-black' : 'text-stone-500'}>{label}</span>
      <span className={emphasized ? 'font-medium text-black' : 'text-black'}>{value}</span>
    </div>
  );
}

function AddressFields({
  title,
  prefix,
  values,
  errors,
  onChange,
}: {
  title?: string;
  prefix: string;
  values: CheckoutAddressInput;
  errors: FieldErrors;
  onChange: (field: keyof CheckoutAddressInput, value: string) => void;
}) {
  const fieldName = (field: keyof CheckoutAddressInput) => prefix ? `${prefix}.${field}` : field;

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-medium text-black">{title}</h3>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          value={values.full_name}
          onChange={(value) => onChange('full_name', value)}
          errors={errors[fieldName('full_name')] ?? []}
        />
        <Field
          label="Phone"
          value={values.phone}
          onChange={(value) => onChange('phone', value)}
          errors={errors[fieldName('phone')] ?? []}
        />
      </div>

      <Field
        label="Address line 1"
        value={values.line_1}
        onChange={(value) => onChange('line_1', value)}
        errors={errors[fieldName('line_1')] ?? []}
      />

      <Field
        label="Address line 2"
        value={values.line_2 ?? ''}
        onChange={(value) => onChange('line_2', value)}
        errors={errors[fieldName('line_2')] ?? []}
        required={false}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City"
          value={values.city}
          onChange={(value) => onChange('city', value)}
          errors={errors[fieldName('city')] ?? []}
        />
        <Field
          label="Postal code"
          value={values.postal_code}
          onChange={(value) => onChange('postal_code', value)}
          errors={errors[fieldName('postal_code')] ?? []}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  errors,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors: string[];
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {!required && <span className="ml-1 text-stone-400">(optional)</span>}
      </Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
      {errors.length > 0 && <p className="text-sm text-red-600">{errors[0]}</p>}
    </div>
  );
}
