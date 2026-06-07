'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import type { AxiosError } from 'axios';
import type { CheckoutAddressInput, SavedAddress } from '@/components/store/cart-provider';
import { AddressFields, type AddressSection } from '@/components/store/address-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

type FieldErrors = Record<string, string[]>;
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
};

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

export function SavedAddressesManager() {
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [addressEditor, setAddressEditor] = useState<AddressEditorState | null>(null);
  const [addressEditorErrors, setAddressEditorErrors] = useState<FieldErrors>({});
  const [addressEditorMessage, setAddressEditorMessage] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressActionId, setAddressActionId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadSavedAddresses();
  }, []);

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

  return (
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
                <label htmlFor="address-type" className="text-sm font-medium text-black">Address type</label>
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
  );
}
