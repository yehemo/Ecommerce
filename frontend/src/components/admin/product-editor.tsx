'use client';

import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

type Category = {
  id: string;
  name: string;
};

type ProductOptionValue = {
  id: string;
  value: string;
  option_type?: {
    id: string;
    name: string;
  };
};

type ProductOptionType = {
  id: string;
  name: string;
  values: Array<{
    id: string;
    value: string;
  }>;
};

type ProductVariant = {
  id: string;
  sku: string;
  price_minor: number;
  stock_qty: number;
  status: string;
  option_values?: ProductOptionValue[];
};

type ProductImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  status: string;
  variants: ProductVariant[];
  option_types: ProductOptionType[];
  images: ProductImage[];
};

type ProductEditorProps = {
  mode: 'create' | 'edit';
  productId?: string;
};

type OptionDraft = {
  key: string;
  name: string;
  valuesText: string;
};

type VariantDraft = {
  key: string;
  id?: string;
  priceMinor: string;
  stockQty: string;
  status: string;
  selections: Record<string, string>;
};

type ImageDraft = {
  key: string;
  id?: string;
  imageUrl: string;
  sortOrder: string;
};

type ApiValidationErrors = Record<string, string[]>;

const emptyVariant = (): VariantDraft => ({
  key: crypto.randomUUID(),
  priceMinor: '',
  stockQty: '',
  status: 'active',
  selections: {},
});

const emptyImage = (): ImageDraft => ({
  key: crypto.randomUUID(),
  imageUrl: '',
  sortOrder: '0',
});

const slugPart = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export function ProductEditor({ mode, productId }: ProductEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [images, setImages] = useState<ImageDraft[]>([emptyImage()]);
  const [errors, setErrors] = useState<ApiValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [categoryResponse, productResponse] = await Promise.all([
          axios.get('/api/categories?per_page=100'),
          mode === 'edit' && productId ? axios.get(`/api/products/${productId}`) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        setCategories(categoryResponse.data.data);

        if (productResponse) {
          const payload = productResponse.data.data as Product;

          setCategoryId(payload.category_id);
          setName(payload.name);
          setDescription(payload.description ?? '');
          setStatus(payload.status);
          setOptions(
            payload.option_types.length
              ? payload.option_types.map((optionType) => ({
                  key: optionType.id,
                  name: optionType.name,
                  valuesText: optionType.values.map((value) => value.value).join(', '),
                }))
              : []
          );
          setVariants(
            payload.variants.length
              ? payload.variants.map((variant) => ({
                  key: variant.id,
                  id: variant.id,
                  priceMinor: String(variant.price_minor),
                  stockQty: String(variant.stock_qty),
                  status: variant.status,
                  selections: (variant.option_values ?? []).reduce<Record<string, string>>((carry, optionValue) => {
                    const optionTypeName = optionValue.option_type?.name;

                    if (optionTypeName) {
                      carry[optionTypeName] = optionValue.value;
                    }

                    return carry;
                  }, {}),
                }))
              : [emptyVariant()]
          );
          setImages(
            payload.images.length
              ? payload.images
                  .sort((left, right) => left.sort_order - right.sort_order)
                  .map((image) => ({
                    key: image.id,
                    id: image.id,
                    imageUrl: image.image_url,
                    sortOrder: String(image.sort_order),
                  }))
              : [emptyImage()]
          );
        }
      } catch {
        if (mounted) {
          setFormError('Failed to load product data.');
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [mode, productId]);

  const parsedOptions = useMemo(
    () =>
      options
        .map((option) => ({
          name: option.name.trim(),
          values: option.valuesText
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        }))
        .filter((option) => option.name && option.values.length),
    [options]
  );

  const parsedImages = useMemo(
    () =>
      images
        .map((image) => ({
          image_url: image.imageUrl.trim(),
          sort_order: Number(image.sortOrder || 0),
        }))
        .filter((image) => image.image_url),
    [images]
  );

  const buildVariantSku = (variant: VariantDraft, index: number) => {
    const base = slugPart(name) || 'PRODUCT';
    const selectionParts = parsedOptions
      .map((option) => slugPart(variant.selections[option.name] ?? ''))
      .filter(Boolean);

    return [base, ...selectionParts, String(index + 1)].join('-');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const basePayload = {
      category_id: categoryId,
      name,
      description: description || null,
      status,
      images: parsedImages,
      options: parsedOptions,
    };

    const variantsPayload = variants.map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: buildVariantSku(variant, index),
      price_minor: Number(variant.priceMinor),
      stock_qty: Number(variant.stockQty),
      status: variant.status,
      options: Object.fromEntries(
        Object.entries(variant.selections).filter(([, value]) => value)
      ),
    }));

    try {
      await axios.get('/sanctum/csrf-cookie');

      if (mode === 'create') {
        await axios.post('/api/products', {
          ...basePayload,
          variants: variantsPayload,
        });
      } else {
        await axios.patch(`/api/products/${productId}`, {
          ...basePayload,
          variants: variantsPayload,
        });
      }

      startTransition(() => {
        router.push('/admin/products');
        router.refresh();
      });
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {});
        return;
      }

      setFormError('Unable to save the product right now.');
    }
  };

  const updateVariantSelection = (variantKey: string, optionName: string, value: string) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === variantKey
          ? {
              ...variant,
              selections: {
                ...variant.selections,
                [optionName]: value,
              },
            }
          : variant
      )
    );
  };

  if (isBootstrapping) {
    return <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-stone-300">Loading editor…</div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">
              {mode === 'create' ? 'New Product' : 'Edit Product'}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {mode === 'create' ? 'Add a catalog item' : 'Refine the product details'}
            </h2>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm text-stone-300">
            <span>Product name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
              placeholder="Essential Hoodie"
            />
            {errors.name && <p className="text-sm text-red-300">{errors.name[0]}</p>}
          </label>

          <label className="space-y-2 text-sm text-stone-300">
            <span>Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-sm text-red-300">{errors.category_id[0]}</p>}
          </label>

          <label className="space-y-2 text-sm text-stone-300 md:col-span-2">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
              placeholder="Describe the product, materials, and fit."
            />
            {errors.description && <p className="text-sm text-red-300">{errors.description[0]}</p>}
          </label>

          <label className="space-y-2 text-sm text-stone-300">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
            {errors.status && <p className="text-sm text-red-300">{errors.status[0]}</p>}
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Options</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Variant dimensions</h3>
          </div>
          <button
            type="button"
            onClick={() =>
              setOptions((current) => [...current, { key: crypto.randomUUID(), name: '', valuesText: '' }])
            }
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
          >
            Add option
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {options.length ? (
            options.map((option, index) => (
              <div key={option.key} className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-stone-950/60 p-5 md:grid-cols-[1fr_2fr_auto]">
                <label className="space-y-2 text-sm text-stone-300">
                  <span>Option name</span>
                  <input
                    value={option.name}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="Color"
                  />
                </label>
                <label className="space-y-2 text-sm text-stone-300">
                  <span>Values</span>
                  <input
                    value={option.valuesText}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, valuesText: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="Black, Cream, Olive"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
                    className="w-full rounded-full border border-red-500/30 px-4 py-3 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-400">Add options if the product has variant dimensions like color or size.</p>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Images</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Product image URLs</h3>
          </div>
          <button
            type="button"
            onClick={() => setImages((current) => [...current, emptyImage()])}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
          >
            Add image
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {images.map((image, index) => (
            <div key={image.key} className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-stone-950/60 p-5 md:grid-cols-[2fr_140px_auto]">
              <label className="space-y-2 text-sm text-stone-300">
                <span>Image URL</span>
                <input
                  value={image.imageUrl}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, imageUrl: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                  placeholder="https://example.com/product-front.jpg"
                />
              </label>
              <label className="space-y-2 text-sm text-stone-300">
                <span>Sort order</span>
                <input
                  type="number"
                  min="0"
                  value={image.sortOrder}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, sortOrder: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setImages((current) =>
                      current.length === 1 ? [emptyImage()] : current.filter((item) => item.key !== image.key)
                    )
                  }
                  className="w-full rounded-full border border-red-500/30 px-4 py-3 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Variants</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Sellable SKUs</h3>
          </div>
          <button
            type="button"
            onClick={() => setVariants((current) => [...current, emptyVariant()])}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
          >
            Add variant
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {variants.map((variant, index) => (
            <div key={variant.key} className="rounded-[1.75rem] border border-white/10 bg-stone-950/60 p-5">
              <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300">Generated SKU</p>
                <p className="mt-2 break-all text-sm font-semibold text-white">{buildVariantSku(variant, index)}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-stone-300">
                  <span>Price (minor units)</span>
                  <input
                    type="number"
                    min="0"
                    value={variant.priceMinor}
                    onChange={(event) =>
                      setVariants((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, priceMinor: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="12999"
                  />
                </label>
                <label className="space-y-2 text-sm text-stone-300">
                  <span>Stock quantity</span>
                  <input
                    type="number"
                    min="0"
                    value={variant.stockQty}
                    onChange={(event) =>
                      setVariants((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, stockQty: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="25"
                  />
                </label>
                <label className="space-y-2 text-sm text-stone-300">
                  <span>Variant status</span>
                  <select
                    value={variant.status}
                    onChange={(event) =>
                      setVariants((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, status: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                  >
                    <option value="active">Active</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              {parsedOptions.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {parsedOptions.map((option) => (
                    <label key={option.name} className="space-y-2 text-sm text-stone-300">
                      <span>{option.name}</span>
                      <select
                        value={variant.selections[option.name] ?? ''}
                        onChange={(event) =>
                          updateVariantSelection(variant.key, option.name, event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
                      >
                        <option value="">Select {option.name}</option>
                        {option.values.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-400">Add option dimensions above to map selections to each variant.</p>
              )}

              {variants.length > 1 && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setVariants((current) => current.filter((item) => item.key !== variant.key))}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100"
                  >
                    Remove variant
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {formError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {formError}
        </div>
      )}
    </form>
  );
}
