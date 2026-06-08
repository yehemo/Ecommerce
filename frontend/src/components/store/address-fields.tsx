'use client';

import type { CheckoutAddressInput } from '@/components/store/cart-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type AddressSection = 'shipping' | 'billing';
type FieldErrors = Record<string, string[]>;

type AddressFieldsProps = {
  title?: string;
  prefix: string;
  values: CheckoutAddressInput;
  errors: FieldErrors;
  onChange: (field: keyof CheckoutAddressInput, value: string) => void;
};

export function AddressFields({
  title,
  prefix,
  values,
  errors,
  onChange,
}: AddressFieldsProps) {
  const fieldError = (field: keyof CheckoutAddressInput) => {
    const key = prefix ? `${prefix}.${field}` : field;
    return errors[key]?.[0];
  };

  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h3 className="text-sm font-medium text-black">{title}</h3>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}-full-name`}
          label="Full name"
          value={values.full_name}
          error={fieldError('full_name')}
          onChange={(value) => onChange('full_name', value)}
        />
        <Field
          id={`${prefix}-phone`}
          label="Phone"
          value={values.phone}
          error={fieldError('phone')}
          onChange={(value) => onChange('phone', value)}
        />
        <Field
          id={`${prefix}-line-1`}
          label="Address line 1"
          value={values.line_1}
          error={fieldError('line_1')}
          onChange={(value) => onChange('line_1', value)}
          className="sm:col-span-2"
        />
        <Field
          id={`${prefix}-line-2`}
          label="Address line 2"
          value={values.line_2 ?? ''}
          error={fieldError('line_2')}
          onChange={(value) => onChange('line_2', value)}
          className="sm:col-span-2"
        />
        <Field
          id={`${prefix}-city`}
          label="City"
          value={values.city}
          error={fieldError('city')}
          onChange={(value) => onChange('city', value)}
        />
        <Field
          id={`${prefix}-postal-code`}
          label="Postal code"
          value={values.postal_code}
          error={fieldError('postal_code')}
          onChange={(value) => onChange('postal_code', value)}
        />
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
