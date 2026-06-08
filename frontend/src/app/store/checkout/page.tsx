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
  type SavedAddress,
  useCart,
} from '@/components/store/cart-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';

const TAX_RATE = 0.08;
const ORDER_ADDRESS_EDIT_WINDOW_MS = 10 * 60 * 1000;
const COMPLETED_ORDER_STORAGE_KEY = 'lyh_completed_order';

type AddressSection = 'shipping' | 'billing';
type AddressMode = 'saved' | 'manual';
type FieldErrors = Record<string, string[]>;
type SavedAddressEditorState = {
  id: string;
  values: SavedAddressFormValues;
};
type SavedAddressFormValues = CheckoutAddressInput & {
  type: AddressSection;
  is_default: boolean;
};
type ApiErrorPayload = {
  errors?: FieldErrors;
  message?: string;
  data?: CheckoutOrderResponse;
};

const formatPrice = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minor / 100);

const emptyAddress = (): CheckoutAddressInput => ({
  full_name: '',
  phone: '',
  line_1: '',
  line_2: '',
  city: '',
  postal_code: '',
});

const addressMatches = (left: CheckoutAddressInput, right: CheckoutAddressInput, type: AddressSection, address: SavedAddress) =>
  address.type === type &&
  address.full_name === left.full_name &&
  address.phone === left.phone &&
  address.line_1 === left.line_1 &&
  (address.line_2 ?? '') === (right.line_2 ?? '') &&
  address.city === left.city &&
  address.postal_code === left.postal_code;

const toAddressInput = (address: SavedAddress): CheckoutAddressInput => ({
  full_name: address.full_name,
  phone: address.phone,
  line_1: address.line_1,
  line_2: address.line_2,
  city: address.city,
  postal_code: address.postal_code,
});

const toSavedAddressFormValues = (address: SavedAddress): SavedAddressFormValues => ({
  ...toAddressInput(address),
  type: address.type,
  is_default: address.is_default,
});

const formatRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const paymentQrIsActive = (expiresAt: string | null | undefined) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now());

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, error: authError } = useAuth({});
  const { items, subtotalMinor, isLoading: cartLoading, refreshCart } = useCart();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isSavedAddressesLoading, setIsSavedAddressesLoading] = useState(true);
  const [savedAddressError, setSavedAddressError] = useState<string | null>(null);

  const [shippingMode, setShippingMode] = useState<AddressMode>('manual');
  const [billingMode, setBillingMode] = useState<AddressMode>('manual');
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string | null>(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [saveShippingAddress, setSaveShippingAddress] = useState(false);
  const [saveBillingAddress, setSaveBillingAddress] = useState(false);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [cartError, setCartError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<CheckoutOrderResponse | null>(null);
  const [isRestoringCompletedOrder, setIsRestoringCompletedOrder] = useState(true);
  const [isRefreshingCompletedOrder, setIsRefreshingCompletedOrder] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  const [savedAddressEditor, setSavedAddressEditor] = useState<SavedAddressEditorState | null>(null);
  const [isSavingSavedAddress, setIsSavingSavedAddress] = useState(false);
  const [savedAddressEditorError, setSavedAddressEditorError] = useState<string | null>(null);

  const [isEditingOrderAddresses, setIsEditingOrderAddresses] = useState(false);
  const [editedShippingAddress, setEditedShippingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [editedBillingAddress, setEditedBillingAddress] = useState<CheckoutAddressInput>(emptyAddress);
  const [editedBillingSameAsShipping, setEditedBillingSameAsShipping] = useState(false);
  const [isUpdatingOrderAddresses, setIsUpdatingOrderAddresses] = useState(false);
  const [activeOrderAction, setActiveOrderAction] = useState<'pay' | 'cancel' | null>(null);
  const [orderAddressErrors, setOrderAddressErrors] = useState<FieldErrors>({});
  const [orderAddressMessage, setOrderAddressMessage] = useState<string | null>(null);

  const previewTaxMinor = Math.round(subtotalMinor * TAX_RATE);
  const previewTotalMinor = subtotalMinor + previewTaxMinor;

  const selectedShippingAddress = savedAddresses.find((address) => address.id === selectedShippingAddressId) ?? null;
  const selectedBillingAddress = savedAddresses.find((address) => address.id === selectedBillingAddressId) ?? null;

  const editableRemainingMs = completedOrder
    ? new Date(completedOrder.placed_at).getTime() + ORDER_ADDRESS_EDIT_WINDOW_MS - nowMs
    : 0;
  const payment = completedOrder?.payments[0] ?? null;
  const hasActiveQr = paymentQrIsActive(payment?.expires_at);
  const isOrderPaid = completedOrder?.payment_status === 'paid' || payment?.status === 'paid';
  const isOrderCancelled = completedOrder?.status === 'cancelled'
    || completedOrder?.payment_status === 'cancelled'
    || payment?.status === 'cancelled';
  const isWithinActionWindow = completedOrder !== null && editableRemainingMs > 0;
  const canManageCompletedOrder = completedOrder !== null
    && isWithinActionWindow
    && !isOrderPaid
    && !isOrderCancelled
    && completedOrder.status === 'pending'
    && completedOrder.payment_status === 'unpaid'
    && payment?.status === 'pending';
  const canEditCompletedOrder = canManageCompletedOrder;
  const hasExpiredPendingOrder = completedOrder !== null
    && !isWithinActionWindow
    && !isOrderPaid
    && !isOrderCancelled;

  const shippingChoices = useMemo(
    () => savedAddresses.filter((address) => address.type === 'shipping' || address.type === 'billing'),
    [savedAddresses],
  );
  const billingChoices = useMemo(
    () => savedAddresses.filter((address) => address.type === 'billing' || address.type === 'shipping'),
    [savedAddresses],
  );

  useEffect(() => {
    if (billingSameAsShipping) {
      setBillingAddress(shippingAddress);
    }
  }, [billingSameAsShipping, shippingAddress]);

  useEffect(() => {
    if (editedBillingSameAsShipping) {
      setEditedBillingAddress(editedShippingAddress);
    }
  }, [editedBillingSameAsShipping, editedShippingAddress]);

  useEffect(() => {
    if (!completedOrder) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [completedOrder]);

  useEffect(() => {
    if (!user) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(COMPLETED_ORDER_STORAGE_KEY);
      }

      setIsRestoringCompletedOrder(false);
      return;
    }

    if (typeof window === 'undefined') {
      setIsRestoringCompletedOrder(false);
      return;
    }

    const restoreCompletedOrder = async () => {
      const storedOrder = sessionStorage.getItem(COMPLETED_ORDER_STORAGE_KEY);

      if (!storedOrder) {
        setIsRestoringCompletedOrder(false);
        return;
      }

      try {
        const parsedOrder = JSON.parse(storedOrder) as CheckoutOrderResponse;
        const response = await axios.get(`/api/orders/${parsedOrder.id}`);
        const order = response.data.data as CheckoutOrderResponse;
        setCompletedOrder(order);
        sessionStorage.setItem(COMPLETED_ORDER_STORAGE_KEY, JSON.stringify(order));
      } catch (error) {
        console.error(error);
        sessionStorage.removeItem(COMPLETED_ORDER_STORAGE_KEY);
      } finally {
        setIsRestoringCompletedOrder(false);
      }
    };

    restoreCompletedOrder();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user && authError) {
      router.replace('/store/login?next=/store/checkout');
    }
  }, [authLoading, authError, router, user]);

  useEffect(() => {
    if (!authLoading && user && !cartLoading && !isRestoringCompletedOrder && items.length === 0 && !completedOrder) {
      router.replace('/store/cart');
    }
  }, [authLoading, cartLoading, completedOrder, isRestoringCompletedOrder, items.length, router, user]);

  useEffect(() => {
    if (!hasExpiredPendingOrder || !completedOrder || isRefreshingCompletedOrder) {
      return;
    }

    let cancelled = false;

    const refreshCompletedOrder = async () => {
      setIsRefreshingCompletedOrder(true);

      try {
        const response = await axios.get(`/api/orders/${completedOrder.id}`);
        const order = response.data.data as CheckoutOrderResponse;

        if (!cancelled) {
          setCompletedOrder(order);
          sessionStorage.setItem(COMPLETED_ORDER_STORAGE_KEY, JSON.stringify(order));
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setIsRefreshingCompletedOrder(false);
        }
      }
    };

    refreshCompletedOrder();

    return () => {
      cancelled = true;
    };
  }, [completedOrder, hasExpiredPendingOrder, isRefreshingCompletedOrder]);

  useEffect(() => {
    if (!completedOrder || !hasActiveQr || isOrderPaid || isOrderCancelled) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await axios.get(`/api/orders/${completedOrder.id}`);
        const order = response.data.data as CheckoutOrderResponse;
        persistCompletedOrder(order);
      } catch (error) {
        console.error(error);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [completedOrder, hasActiveQr, isOrderCancelled, isOrderPaid]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setIsSavedAddressesLoading(false);
      return;
    }

    const loadSavedAddresses = async () => {
      setIsSavedAddressesLoading(true);
      setSavedAddressError(null);

      try {
        const response = await axios.get('/api/addresses');
        setSavedAddresses(response.data.data as SavedAddress[]);
      } catch (error) {
        console.error(error);
        setSavedAddressError('Unable to load saved addresses right now.');
      } finally {
        setIsSavedAddressesLoading(false);
      }
    };

    loadSavedAddresses();
  }, [user]);

  useEffect(() => {
    if (savedAddresses.length === 0) {
      setSelectedShippingAddressId(null);
      setSelectedBillingAddressId(null);
      setShippingMode('manual');

      if (!billingSameAsShipping) {
        setBillingMode('manual');
      }

      return;
    }

    const preferredShipping = savedAddresses.find((address) => address.type === 'shipping' && address.is_default)
      ?? savedAddresses.find((address) => address.type === 'shipping')
      ?? savedAddresses[0];
    const preferredBilling = savedAddresses.find((address) => address.type === 'billing' && address.is_default)
      ?? savedAddresses.find((address) => address.type === 'billing')
      ?? preferredShipping;

    if (!selectedShippingAddressId || !savedAddresses.some((address) => address.id === selectedShippingAddressId)) {
      setSelectedShippingAddressId(preferredShipping.id);
      setShippingMode((current) => (current === 'manual' ? 'saved' : current));
    }

    if (!selectedBillingAddressId || !savedAddresses.some((address) => address.id === selectedBillingAddressId)) {
      setSelectedBillingAddressId(preferredBilling.id);
      setBillingMode((current) => (current === 'manual' ? 'saved' : current));
    }
  }, [billingSameAsShipping, savedAddresses, selectedBillingAddressId, selectedShippingAddressId]);

  const handleAddressChange = (
    section: AddressSection,
    field: keyof CheckoutAddressInput,
    value: string,
  ) => {
    const setter = section === 'shipping' ? setShippingAddress : setBillingAddress;

    setter((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`${section}_address.${field}`];
      return next;
    });
    setCartError(null);
  };

  const refreshSavedAddresses = async () => {
    const response = await axios.get('/api/addresses');
    const nextAddresses = response.data.data as SavedAddress[];
    setSavedAddresses(nextAddresses);

    return nextAddresses;
  };

  const persistCompletedOrder = (order: CheckoutOrderResponse | null) => {
    setCompletedOrder(order);

    if (typeof window === 'undefined') {
      return;
    }

    if (!order) {
      sessionStorage.removeItem(COMPLETED_ORDER_STORAGE_KEY);
      return;
    }

    setNowMs(Date.now());
    sessionStorage.setItem(COMPLETED_ORDER_STORAGE_KEY, JSON.stringify(order));
  };

  useEffect(() => {
    if (cartLoading || !completedOrder || items.length === 0) {
      return;
    }

    persistCompletedOrder(null);
    setIsEditingOrderAddresses(false);
    setOrderAddressErrors({});
    setOrderAddressMessage(null);
    setActiveOrderAction(null);
  }, [cartLoading, completedOrder, items.length]);

  const ensureSavedAddress = async (section: AddressSection, address: CheckoutAddressInput) => {
    const matchingAddress = savedAddresses.find((savedAddress) =>
      addressMatches(address, address, section, savedAddress),
    );

    if (matchingAddress) {
      return matchingAddress;
    }

    const response = await axios.post('/api/addresses', {
      type: section,
      ...address,
      line_2: address.line_2 || null,
      is_default: false,
    });
    const createdAddress = response.data.data as SavedAddress;

    setSavedAddresses((current) => [createdAddress, ...current]);

    return createdAddress;
  };

  const resolveAddressForCheckout = (section: AddressSection): CheckoutAddressInput | null => {
    if (section === 'billing' && billingSameAsShipping) {
      return resolveAddressForCheckout('shipping');
    }

    if (section === 'shipping' ? shippingMode === 'saved' : billingMode === 'saved') {
      const selected = section === 'shipping' ? selectedShippingAddress : selectedBillingAddress;
      return selected ? toAddressInput(selected) : null;
    }

    return section === 'shipping' ? shippingAddress : billingAddress;
  };

  const submitCheckout = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSubmitting(true);
    setFieldErrors({});
    setCartError(null);

    try {
      const resolvedShippingAddress = resolveAddressForCheckout('shipping');
      const resolvedBillingAddress = resolveAddressForCheckout('billing');

      if (!resolvedShippingAddress || !resolvedBillingAddress) {
        setCartError('Please choose or enter both shipping and billing addresses.');
        setIsSubmitting(false);
        return;
      }

      if (shippingMode === 'manual' && saveShippingAddress) {
        await ensureSavedAddress('shipping', resolvedShippingAddress);
      }

      if (!billingSameAsShipping && billingMode === 'manual' && saveBillingAddress) {
        await ensureSavedAddress('billing', resolvedBillingAddress);
      }

      const payload = {
        shipping_address: {
          ...resolvedShippingAddress,
          line_2: resolvedShippingAddress.line_2 || null,
        },
        billing_address: {
          ...resolvedBillingAddress,
          line_2: resolvedBillingAddress.line_2 || null,
        },
      };

      const response = await axios.post('/api/checkout', payload);
      const order = response.data.data as CheckoutOrderResponse;
      let nextOrder = order;

      try {
        const paymentResponse = await axios.post(`/api/orders/${order.id}/pay`);
        nextOrder = paymentResponse.data.data as CheckoutOrderResponse;
        setOrderAddressMessage(paymentResponse.data.message ?? 'PayWay QR is ready for payment.');
      } catch (paymentError: unknown) {
        const paymentAxiosError = paymentError as AxiosError<ApiErrorPayload>;
        const responseOrder = paymentAxiosError.response?.data?.data;

        if (responseOrder) {
          nextOrder = responseOrder;
        }

        setOrderAddressMessage(
          paymentAxiosError.response?.data?.message ?? 'Order created, but QR could not be prepared immediately.',
        );
      }

      persistCompletedOrder(nextOrder);
      setIsEditingOrderAddresses(false);
      setOrderAddressErrors({});
      await refreshCart();
      await refreshSavedAddresses();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 422) {
        const errors = axiosError.response.data?.errors;

        if (errors) {
          setFieldErrors(errors);
          if (errors.cart?.[0]) {
            setCartError(errors.cart[0]);
          }
        } else if (axiosError.response.data?.message) {
          setCartError(axiosError.response.data.message);
        }
      } else {
        setCartError('Unable to complete checkout right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEditedSavedAddress = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!savedAddressEditor) {
      return;
    }

    setIsSavingSavedAddress(true);
    setSavedAddressEditorError(null);

    try {
      await axios.patch(`/api/addresses/${savedAddressEditor.id}`, {
        ...savedAddressEditor.values,
        line_2: savedAddressEditor.values.line_2 || null,
      });
      await refreshSavedAddresses();
      setSavedAddressEditor(null);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 422 && axiosError.response.data?.message) {
        setSavedAddressEditorError(axiosError.response.data.message);
      } else {
        setSavedAddressEditorError('Unable to update this saved address right now.');
      }
    } finally {
      setIsSavingSavedAddress(false);
    }
  };

  const deleteSavedAddress = async (address: SavedAddress) => {
    if (!window.confirm('Delete this saved address?')) {
      return;
    }

    try {
      await axios.delete(`/api/addresses/${address.id}`);
      const nextAddresses = savedAddresses.filter((current) => current.id !== address.id);
      setSavedAddresses(nextAddresses);

      if (selectedShippingAddressId === address.id) {
        setSelectedShippingAddressId(nextAddresses[0]?.id ?? null);
      }

      if (selectedBillingAddressId === address.id) {
        setSelectedBillingAddressId(nextAddresses[0]?.id ?? null);
      }
    } catch (error) {
      console.error(error);
      setSavedAddressError('Unable to delete this saved address right now.');
    }
  };

  const beginOrderAddressEdit = () => {
    if (!completedOrder) {
      return;
    }

    const shipping = completedOrder.addresses.find((address) => address.type === 'shipping');
    const billing = completedOrder.addresses.find((address) => address.type === 'billing');

    if (!shipping || !billing) {
      return;
    }

    setEditedShippingAddress(toAddressInput({
      ...shipping,
      is_default: false,
      type: 'shipping',
    }));
    setEditedBillingAddress(toAddressInput({
      ...billing,
      is_default: false,
      type: 'billing',
    }));
    setEditedBillingSameAsShipping(false);
    setOrderAddressErrors({});
    setOrderAddressMessage(null);
    setIsEditingOrderAddresses(true);
  };

  const submitOrderAddressUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!completedOrder) {
      return;
    }

    setIsUpdatingOrderAddresses(true);
    setOrderAddressErrors({});
    setOrderAddressMessage(null);

    try {
      const payload = {
        shipping_address: {
          ...editedShippingAddress,
          line_2: editedShippingAddress.line_2 || null,
        },
        billing_address: {
          ...(editedBillingSameAsShipping ? editedShippingAddress : editedBillingAddress),
          line_2: (editedBillingSameAsShipping ? editedShippingAddress.line_2 : editedBillingAddress.line_2) || null,
        },
      };

      const response = await axios.patch(`/api/orders/${completedOrder.id}/addresses`, payload);
      persistCompletedOrder(response.data.data as CheckoutOrderResponse);
      setIsEditingOrderAddresses(false);
      setOrderAddressMessage('Order addresses updated.');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 422) {
        if (axiosError.response.data?.errors) {
          setOrderAddressErrors(axiosError.response.data.errors);
        }

        setOrderAddressMessage(
          axiosError.response.data?.message || 'Order addresses can no longer be updated.',
        );
      } else {
        setOrderAddressMessage('Unable to update the order addresses right now.');
      }
    } finally {
      setIsUpdatingOrderAddresses(false);
    }
  };

  const submitOrderAction = async (action: 'pay' | 'cancel') => {
    if (!completedOrder) {
      return;
    }

    setActiveOrderAction(action);
    setOrderAddressMessage(null);

    try {
      const response = await axios.post(`/api/orders/${completedOrder.id}/${action}`);
      const order = response.data.data as CheckoutOrderResponse;

      persistCompletedOrder(order);
      setIsEditingOrderAddresses(false);
      setOrderAddressErrors({});
      setOrderAddressMessage(
        action === 'pay' ? (response.data.message ?? 'PayWay QR is ready for payment.') : 'Order cancelled successfully.',
      );
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const responseOrder = axiosError.response?.data?.data;

      if (responseOrder) {
        persistCompletedOrder(responseOrder);
      }

      setOrderAddressMessage(
        axiosError.response?.data?.message
          || (action === 'pay'
            ? 'Unable to prepare PayWay QR right now.'
            : 'Unable to cancel this order right now.'),
      );
    } finally {
      setActiveOrderAction(null);
    }
  };

  if (authLoading || isRestoringCompletedOrder || (user && cartLoading && !completedOrder)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-stone-500">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-stone-300" />
        <p className="text-sm tracking-[0.2em] uppercase">Preparing checkout</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (completedOrder) {
    const shipping = completedOrder.addresses.find((address) => address.type === 'shipping');
    const billing = completedOrder.addresses.find((address) => address.type === 'billing');

    return (
      <div className="mx-auto flex w-full max-w-screen-lg flex-1 flex-col px-4 py-12 sm:px-6 lg:px-10">
        <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-stone-50 p-8 shadow-sm sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-700">Order placed</p>
              <h1 className="mt-2 text-3xl font-light tracking-tight text-stone-950">Checkout complete</h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                {isOrderPaid
                  ? 'Your PayWay payment is confirmed and the order is moving forward.'
                  : isOrderCancelled
                    ? 'This order is no longer active. The pending payment has been cancelled.'
                    : 'Your order is ready for PayWay KHQR payment within the 10-minute action window.'}
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600">
            <Clock3 className="h-4 w-4 text-stone-400" />
            {canManageCompletedOrder ? (
              <span>
                Scan the QR, cancel, or edit addresses within {formatRemaining(editableRemainingMs)}.
              </span>
            ) : hasExpiredPendingOrder || isRefreshingCompletedOrder ? (
              <span>Payment window expired. Refreshing final order state…</span>
            ) : isOrderCancelled ? (
              <span>This order has been cancelled or expired.</span>
            ) : isOrderPaid ? (
              <span>Payment completed within the 10-minute action window.</span>
            ) : (
              <span>The 10-minute action window has closed.</span>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Order number</p>
                    <p className="mt-1 text-lg font-medium text-stone-900">{completedOrder.order_number}</p>
                  </div>
                  <div className="text-sm text-stone-500">
                    {new Date(completedOrder.placed_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <h2 className="text-lg font-medium text-stone-900">Items</h2>
                <div className="mt-5 space-y-4">
                  {completedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-stone-900">{item.product_name}</p>
                        <p className="mt-1 text-sm text-stone-500">SKU {item.sku}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatPrice(item.unit_price_minor, completedOrder.currency)} x {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-stone-900">
                        {formatPrice(item.line_total_minor, completedOrder.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {canEditCompletedOrder ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-medium text-stone-900">Need to change the order address?</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        This updates the order snapshot only. Your saved addresses stay unchanged.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={() => {
                        if (isEditingOrderAddresses) {
                          setIsEditingOrderAddresses(false);
                          setOrderAddressErrors({});
                          setOrderAddressMessage(null);
                          return;
                        }

                        beginOrderAddressEdit();
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {isEditingOrderAddresses ? 'Cancel edit' : 'Edit addresses'}
                    </Button>
                  </div>

                  {isEditingOrderAddresses ? (
                    <form onSubmit={submitOrderAddressUpdate} className="mt-6 space-y-6">
                      <AddressFields
                        address={editedShippingAddress}
                        prefix="shipping_address"
                        errors={orderAddressErrors}
                        onChange={(field, value) => {
                          setEditedShippingAddress((current) => ({ ...current, [field]: value }));
                          setOrderAddressErrors((current) => {
                            const next = { ...current };
                            delete next[`shipping_address.${field}`];
                            return next;
                          });
                        }}
                      />

                      <label className="inline-flex items-center gap-3 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600">
                        <input
                          type="checkbox"
                          checked={editedBillingSameAsShipping}
                          onChange={(event) => setEditedBillingSameAsShipping(event.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-black focus:ring-black"
                        />
                        Billing same as shipping
                      </label>

                      <AddressFields
                        address={editedBillingSameAsShipping ? editedShippingAddress : editedBillingAddress}
                        prefix="billing_address"
                        errors={orderAddressErrors}
                        disabled={editedBillingSameAsShipping}
                        onChange={(field, value) => {
                          setEditedBillingAddress((current) => ({ ...current, [field]: value }));
                          setOrderAddressErrors((current) => {
                            const next = { ...current };
                            delete next[`billing_address.${field}`];
                            return next;
                          });
                        }}
                      />

                      {orderAddressMessage ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                          {orderAddressMessage}
                        </div>
                      ) : null}

                      <Button
                        type="submit"
                        size="lg"
                        disabled={isUpdatingOrderAddresses}
                        className="rounded-full bg-black px-6 text-white hover:bg-stone-800"
                      >
                        {isUpdatingOrderAddresses ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save order addresses
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <h2 className="text-lg font-medium text-stone-900">Payment</h2>
                <div className="mt-4 space-y-2 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>Order status</span>
                    <span className="font-medium uppercase text-stone-900">{completedOrder.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-medium uppercase text-stone-900">{payment?.status ?? 'pending'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Provider</span>
                    <span className="font-medium text-stone-900">{payment?.provider ?? 'payway'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-medium text-stone-900">
                      {formatPrice(payment?.amount_minor ?? completedOrder.total_minor, completedOrder.currency)}
                    </span>
                  </div>
                  {payment?.provider_reference ? (
                    <div className="flex justify-between gap-4">
                      <span>Transaction</span>
                      <span className="font-medium text-right text-stone-900">{payment.provider_reference}</span>
                    </div>
                  ) : null}
                </div>
                {payment?.qr_image && canManageCompletedOrder ? (
                  <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm font-medium text-stone-900">Scan to pay</p>
                    <p className="mt-1 text-sm text-stone-500">
                      Use any KHQR-supported banking app or open ABA Mobile directly.
                    </p>
                    <div className="mt-4 flex justify-center rounded-2xl bg-white p-5 sm:p-6">
                      <img
                        src={payment.qr_image}
                        alt={`PayWay QR for order ${completedOrder.order_number}`}
                        className="h-80 w-80 max-w-full rounded-xl object-contain sm:h-96 sm:w-96"
                      />
                    </div>
                    {payment.deeplink ? (
                      <Button asChild variant="outline" className="mt-4 w-full rounded-full">
                        <a href={payment.deeplink}>Open ABA Mobile</a>
                      </Button>
                    ) : null}
                    <p className="mt-4 text-xs text-stone-500">
                      {payment.expires_at
                        ? `QR active until ${new Date(payment.expires_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}.`
                        : 'Waiting for payment confirmation.'}
                    </p>
                  </div>
                ) : null}
                {canManageCompletedOrder ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4"
                      disabled={activeOrderAction !== null}
                      onClick={() => submitOrderAction('cancel')}
                    >
                      {activeOrderAction === 'cancel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Cancel order
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <h2 className="text-lg font-medium text-stone-900">Addresses</h2>
                <div className="mt-4 space-y-5 text-sm text-stone-600">
                  {[shipping, billing].filter(Boolean).map((address) => (
                    <div key={address?.id}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                        {address?.type}
                      </p>
                      <p className="mt-2 font-medium text-stone-900">{address?.full_name}</p>
                      <p>{address?.line_1}</p>
                      {address?.line_2 ? <p>{address.line_2}</p> : null}
                      <p>
                        {address?.city} {address?.postal_code}
                      </p>
                      <p>{address?.phone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                <div className="space-y-3 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-stone-900">
                      {formatPrice(completedOrder.subtotal_minor, completedOrder.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-medium text-stone-900">
                      {formatPrice(completedOrder.shipping_fee_minor, completedOrder.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-medium text-stone-900">
                      {formatPrice(completedOrder.tax_minor, completedOrder.currency)}
                    </span>
                  </div>
                </div>
                <Separator className="my-4 bg-stone-200" />
                <div className="flex justify-between text-base font-medium text-stone-950">
                  <span>Total</span>
                  <span>{formatPrice(completedOrder.total_minor, completedOrder.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {orderAddressMessage ? (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
              {orderAddressMessage}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-black px-6 text-white hover:bg-stone-800">
              <Link href="/store">Continue shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link href="/store/cart">View fresh cart</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-stone-400">Secure checkout</p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-stone-950">Shipping and billing</h1>
        </div>
        <Button asChild variant="ghost" className="rounded-full px-4 text-stone-600 hover:text-stone-900">
          <Link href="/store/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cart
          </Link>
        </Button>
      </div>

      {savedAddressEditor ? (
        <section className="mb-8 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">Saved address editor</p>
              <h2 className="mt-1 text-xl font-medium text-stone-950">Update reusable address</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => {
                setSavedAddressEditor(null);
                setSavedAddressEditorError(null);
              }}
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={saveEditedSavedAddress} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="saved_address.type" className="mb-2 block text-sm text-stone-700">
                  Address type
                </Label>
                <select
                  id="saved_address.type"
                  value={savedAddressEditor.values.type}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-stone-400"
                  onChange={(event) =>
                    setSavedAddressEditor((current) =>
                      current
                        ? {
                            ...current,
                            values: {
                              ...current.values,
                              type: event.target.value as AddressSection,
                            },
                          }
                        : current,
                    )
                  }
                >
                  <option value="shipping">Shipping</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-3 self-end rounded-full border border-stone-200 px-4 py-3 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={savedAddressEditor.values.is_default}
                  onChange={(event) =>
                    setSavedAddressEditor((current) =>
                      current
                        ? {
                            ...current,
                            values: {
                              ...current.values,
                              is_default: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                  className="h-4 w-4 rounded border-stone-300 text-black focus:ring-black"
                />
                Mark as default
              </label>
            </div>

            <AddressFields
              address={savedAddressEditor.values}
              prefix="saved_address"
              errors={{}}
              onChange={(field, value) =>
                setSavedAddressEditor((current) =>
                  current
                    ? {
                        ...current,
                        values: {
                          ...current.values,
                          [field]: value,
                        },
                      }
                    : current,
                )
              }
            />

            {savedAddressEditorError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {savedAddressEditorError}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={isSavingSavedAddress}
              className="rounded-full bg-black px-6 text-white hover:bg-stone-800"
            >
              {isSavingSavedAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save reusable address
            </Button>
          </form>
        </section>
      ) : null}

      {savedAddressError ? (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {savedAddressError}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submitCheckout} className="space-y-8">
          <AddressFormSection
            title="Shipping address"
            description="Choose a reusable shipping address or enter a new one for this order."
            section="shipping"
            mode={shippingMode}
            setMode={setShippingMode}
            savedAddresses={shippingChoices}
            selectedAddressId={selectedShippingAddressId}
            setSelectedAddressId={setSelectedShippingAddressId}
            manualAddress={shippingAddress}
            manualSaveChecked={saveShippingAddress}
            setManualSaveChecked={setSaveShippingAddress}
            errors={fieldErrors}
            isSavedAddressesLoading={isSavedAddressesLoading}
            onManualChange={(field, value) => handleAddressChange('shipping', field, value)}
            onEditSavedAddress={(address) => {
              setSavedAddressEditor({
                id: address.id,
                values: toSavedAddressFormValues(address),
              });
              setSavedAddressEditorError(null);
            }}
            onDeleteSavedAddress={deleteSavedAddress}
          />

          <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-medium text-stone-950">Billing address</h2>
                <p className="mt-1 text-sm text-stone-500">Billing is required before the PayWay KHQR payment step.</p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-black focus:ring-black"
                />
                Same as shipping
              </label>
            </div>

            {billingSameAsShipping ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-600">
                Billing will use the same address selected for shipping.
              </div>
            ) : (
              <AddressFormSection
                title=""
                description=""
                section="billing"
                mode={billingMode}
                setMode={setBillingMode}
                savedAddresses={billingChoices}
                selectedAddressId={selectedBillingAddressId}
                setSelectedAddressId={setSelectedBillingAddressId}
                manualAddress={billingAddress}
                manualSaveChecked={saveBillingAddress}
                setManualSaveChecked={setSaveBillingAddress}
                errors={fieldErrors}
                isSavedAddressesLoading={isSavedAddressesLoading}
                onManualChange={(field, value) => handleAddressChange('billing', field, value)}
                onEditSavedAddress={(address) => {
                  setSavedAddressEditor({
                    id: address.id,
                    values: toSavedAddressFormValues(address),
                  });
                  setSavedAddressEditorError(null);
                }}
                onDeleteSavedAddress={deleteSavedAddress}
                hideHeader
              />
            )}
          </section>

          {cartError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cartError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || items.length === 0}
              className="rounded-full bg-black px-6 text-white hover:bg-stone-800"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Place order
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button asChild type="button" size="lg" variant="outline" className="rounded-full px-6">
              <Link href="/store/cart">Review cart</Link>
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-[2rem] border border-stone-200 bg-stone-50 p-6 shadow-sm sm:p-8 lg:sticky lg:top-24">
          <h2 className="text-lg font-medium text-stone-900">Order summary</h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">{item.product_variant.product.name}</p>
                  <p className="mt-1 text-sm text-stone-500">SKU {item.product_variant.sku}</p>
                  <p className="mt-1 text-sm text-stone-500">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-stone-900">
                  {formatPrice(item.unit_price_minor * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-6 bg-stone-200" />

          <div className="space-y-3 text-sm text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-stone-900">{formatPrice(subtotalMinor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium text-stone-900">{formatPrice(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-medium text-stone-900">{formatPrice(previewTaxMinor)}</span>
            </div>
          </div>

          <Separator className="my-6 bg-stone-200" />

          <div className="flex justify-between text-lg font-medium text-stone-950">
            <span>Total</span>
            <span>{formatPrice(previewTotalMinor)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddressFormSection({
  title,
  description,
  section,
  mode,
  setMode,
  savedAddresses,
  selectedAddressId,
  setSelectedAddressId,
  manualAddress,
  manualSaveChecked,
  setManualSaveChecked,
  errors,
  isSavedAddressesLoading,
  onManualChange,
  onEditSavedAddress,
  onDeleteSavedAddress,
  hideHeader = false,
}: {
  title: string;
  description: string;
  section: AddressSection;
  mode: AddressMode;
  setMode: (mode: AddressMode) => void;
  savedAddresses: SavedAddress[];
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  manualAddress: CheckoutAddressInput;
  manualSaveChecked: boolean;
  setManualSaveChecked: (checked: boolean) => void;
  errors: FieldErrors;
  isSavedAddressesLoading: boolean;
  onManualChange: (field: keyof CheckoutAddressInput, value: string) => void;
  onEditSavedAddress: (address: SavedAddress) => void;
  onDeleteSavedAddress: (address: SavedAddress) => void;
  hideHeader?: boolean;
}) {
  return (
    <section className={hideHeader ? '' : 'rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8'}>
      {!hideHeader ? (
        <div className="mb-6">
          <h2 className="text-xl font-medium text-stone-950">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === 'saved' ? 'default' : 'outline'}
          className={`rounded-full px-4 ${mode === 'saved' ? 'bg-black text-white hover:bg-stone-800' : ''}`}
          onClick={() => setMode('saved')}
        >
          Use saved
        </Button>
        <Button
          type="button"
          variant={mode === 'manual' ? 'default' : 'outline'}
          className={`rounded-full px-4 ${mode === 'manual' ? 'bg-black text-white hover:bg-stone-800' : ''}`}
          onClick={() => setMode('manual')}
        >
          Enter manually
        </Button>
      </div>

      {mode === 'saved' ? (
        isSavedAddressesLoading ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
            Loading saved addresses…
          </div>
        ) : savedAddresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
            No saved addresses yet. Switch to manual entry and optionally save one during checkout.
          </div>
        ) : (
          <div className="space-y-3">
            {savedAddresses.map((address) => {
              const isSelected = selectedAddressId === address.id;

              return (
                <div
                  key={address.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    isSelected ? 'border-black bg-stone-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-900">{address.full_name}</p>
                        <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                          {address.type}
                        </span>
                        {address.is_default ? (
                          <span className="rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-stone-600">{address.line_1}</p>
                      {address.line_2 ? <p className="text-sm text-stone-600">{address.line_2}</p> : null}
                      <p className="text-sm text-stone-600">
                        {address.city} {address.postal_code}
                      </p>
                      <p className="text-sm text-stone-600">{address.phone}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className={`rounded-full px-3 ${isSelected ? 'bg-black text-white hover:bg-stone-800' : ''}`}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        {isSelected ? 'Selected' : 'Use'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3"
                        onClick={() => onEditSavedAddress(address)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 text-red-600 hover:text-red-700"
                        onClick={() => onDeleteSavedAddress(address)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <AddressFields
            address={manualAddress}
            prefix={`${section}_address`}
            errors={errors}
            onChange={onManualChange}
          />
          <label className="mt-5 inline-flex items-center gap-3 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={manualSaveChecked}
              onChange={(event) => setManualSaveChecked(event.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-black focus:ring-black"
            />
            Save this {section} address for next time
          </label>
        </>
      )}
    </section>
  );
}

function AddressFields({
  address,
  prefix,
  errors,
  disabled = false,
  onChange,
}: {
  address: CheckoutAddressInput;
  prefix: string;
  errors: FieldErrors;
  disabled?: boolean;
  onChange: (field: keyof CheckoutAddressInput, value: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        id={`${prefix}.full_name`}
        label="Full name"
        value={address.full_name}
        error={errors[`${prefix}.full_name`]?.[0]}
        disabled={disabled}
        onChange={(value) => onChange('full_name', value)}
      />
      <Field
        id={`${prefix}.phone`}
        label="Phone"
        value={address.phone}
        error={errors[`${prefix}.phone`]?.[0]}
        disabled={disabled}
        onChange={(value) => onChange('phone', value)}
      />
      <Field
        id={`${prefix}.line_1`}
        label="Address line 1"
        value={address.line_1}
        error={errors[`${prefix}.line_1`]?.[0]}
        disabled={disabled}
        className="sm:col-span-2"
        onChange={(value) => onChange('line_1', value)}
      />
      <Field
        id={`${prefix}.line_2`}
        label="Address line 2"
        value={address.line_2 ?? ''}
        error={errors[`${prefix}.line_2`]?.[0]}
        disabled={disabled}
        className="sm:col-span-2"
        onChange={(value) => onChange('line_2', value)}
      />
      <Field
        id={`${prefix}.city`}
        label="City"
        value={address.city}
        error={errors[`${prefix}.city`]?.[0]}
        disabled={disabled}
        onChange={(value) => onChange('city', value)}
      />
      <Field
        id={`${prefix}.postal_code`}
        label="Postal code"
        value={address.postal_code}
        error={errors[`${prefix}.postal_code`]?.[0]}
        disabled={disabled}
        onChange={(value) => onChange('postal_code', value)}
      />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  error,
  disabled = false,
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-2 block text-sm text-stone-700">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="h-11 rounded-xl border-stone-200 bg-white px-4"
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
