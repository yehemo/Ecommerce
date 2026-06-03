'use client';

import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2, Upload, ImageIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  isUploading?: boolean;
  uploadError?: string;
  previewUrl?: string;
};

type ApiValidationErrors = Record<string, string[]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadImageFile(file: File): Promise<string> {
  await axios.get('/sanctum/csrf-cookie');
  const form = new FormData();
  form.append('image', file);
  const res = await axios.post('/api/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url as string;
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  label,
  title,
  action,
  children,
}: {
  label: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            {label}
          </p>
          <CardTitle className="mt-1 text-lg">{title}</CardTitle>
        </div>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [errors, setErrors] = useState<ApiValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

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
              ? payload.option_types.map((ot) => ({
                  key: ot.id,
                  name: ot.name,
                  valuesText: ot.values.map((v) => v.value).join(', '),
                }))
              : []
          );
          setVariants(
            payload.variants.length
              ? payload.variants.map((v) => ({
                  key: v.id,
                  id: v.id,
                  priceMinor: String(v.price_minor),
                  stockQty: String(v.stock_qty),
                  status: v.status,
                  selections: (v.option_values ?? []).reduce<Record<string, string>>((carry, ov) => {
                    if (ov.option_type?.name) carry[ov.option_type.name] = ov.value;
                    return carry;
                  }, {}),
                }))
              : [emptyVariant()]
          );
          setImages(
            payload.images.length
              ? payload.images
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((img) => ({
                    key: img.id,
                    id: img.id,
                    imageUrl: img.image_url,
                    sortOrder: String(img.sort_order),
                  }))
              : []
          );
        }
      } catch {
        if (mounted) setFormError('Failed to load product data.');
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [mode, productId]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const parsedOptions = useMemo(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: o.valuesText
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length),
    [options]
  );

  const parsedImages = useMemo(
    () =>
      images
        .map((img) => ({
          image_url: img.imageUrl.trim(),
          sort_order: Number(img.sortOrder || 0),
        }))
        .filter((img) => img.image_url),
    [images]
  );

  const buildVariantSku = (variant: VariantDraft, index: number) => {
    const base = slugPart(name) || 'PRODUCT';
    const selectionParts = parsedOptions
      .map((o) => slugPart(variant.selections[o.name] ?? ''))
      .filter(Boolean);
    return [base, ...selectionParts, String(index + 1)].join('-');
  };

  // ── Upload helpers ────────────────────────────────────────────────────────

  const handleFilesAdded = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    imageFiles.forEach(async (file) => {
      const draftKey = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      setImages((current) => {
        const nonEmpty = current.filter((img) => img.imageUrl !== '' || img.isUploading);
        return [
          ...nonEmpty,
          { key: draftKey, imageUrl: '', sortOrder: String(nonEmpty.length), isUploading: true, previewUrl: preview },
        ];
      });

      try {
        const url = await uploadImageFile(file);
        setImages((current) =>
          current.map((img) =>
            img.key === draftKey ? { ...img, imageUrl: url, isUploading: false } : img
          )
        );
      } catch {
        setImages((current) =>
          current.map((img) =>
            img.key === draftKey
              ? { ...img, isUploading: false, uploadError: 'Upload failed — try pasting a URL instead.' }
              : img
          )
        );
      }
    });
  };

  const handleReplaceFile = async (imageKey: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setImages((current) =>
      current.map((img) =>
        img.key === imageKey ? { ...img, isUploading: true, previewUrl: preview, uploadError: undefined } : img
      )
    );
    try {
      const url = await uploadImageFile(file);
      setImages((current) =>
        current.map((img) => (img.key === imageKey ? { ...img, imageUrl: url, isUploading: false } : img))
      );
    } catch {
      setImages((current) =>
        current.map((img) =>
          img.key === imageKey ? { ...img, isUploading: false, uploadError: 'Upload failed.' } : img
        )
      );
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

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

    const variantsPayload = variants.map((v, i) => ({
      ...(v.id ? { id: v.id } : {}),
      sku: buildVariantSku(v, i),
      price_minor: Number(v.priceMinor),
      stock_qty: Number(v.stockQty),
      status: v.status,
      options: Object.fromEntries(Object.entries(v.selections).filter(([, val]) => val)),
    }));

    try {
      await axios.get('/sanctum/csrf-cookie');
      if (mode === 'create') {
        await axios.post('/api/products', { ...basePayload, variants: variantsPayload });
      } else {
        await axios.patch(`/api/products/${productId}`, { ...basePayload, variants: variantsPayload });
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
      current.map((v) =>
        v.key === variantKey ? { ...v, selections: { ...v.selections, [optionName]: value } } : v
      )
    );
  };

  const handleGenerateVariants = () => {
    if (!parsedOptions.length) return;

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>((a, b) =>
        a.flatMap(d => b.map(e => [...d, e])),
        [[]]
      );
    };

    const optionNames = parsedOptions.map(o => o.name);
    const optionValuesArrays = parsedOptions.map(o => o.values);
    const combinations = cartesian(optionValuesArrays);
    
    setVariants((current) => {
      const newVariants = [...current];
      
      combinations.forEach(combo => {
        const selections = Object.fromEntries(combo.map((val, i) => [optionNames[i], val]));
        
        const exists = current.some(v => 
          Object.keys(selections).length > 0 &&
          Object.entries(selections).every(([k, val]) => v.selections[k] === val)
        );

        if (!exists) {
          newVariants.push({
            key: crypto.randomUUID(),
            priceMinor: current[0]?.priceMinor || '',
            stockQty: current[0]?.stockQty || '10',
            status: 'active',
            selections,
          });
        }
      });
      
      // Optionally remove empty initial variant if generating for the first time
      if (newVariants.length > 1 && newVariants[0].priceMinor === '' && Object.keys(newVariants[0].selections).length === 0) {
        newVariants.shift();
      }
      
      return newVariants;
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading editor…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={save} className="space-y-5">

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            {mode === 'create' ? 'New product' : 'Edit product'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {mode === 'create' ? 'Add a catalog item' : 'Refine product details'}
          </h2>
        </div>
        <Button type="submit" disabled={isPending} size="lg">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
      </div>

      {/* ── Basic info ───────────────────────────────────────────────────── */}
      <Section label="Details" title="Basic information">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Essential Hoodie"
              className="h-10"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="product-category" className="h-10 w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id[0]}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the product, materials, and fit."
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="product-status" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Inactive
                  </span>
                </SelectItem>
                <SelectItem value="draft">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Draft
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive">{errors.status[0]}</p>}
          </div>
        </div>
      </Section>

      {/* ── Images ───────────────────────────────────────────────────────── */}
      <Section
        label="Media"
        title="Product images"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImages((current) => [...current, emptyImage()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add row
          </Button>
        }
      >
        {/* Drop zone */}
        <div
          className="mb-5 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-ring hover:bg-muted/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesAdded(Array.from(e.dataTransfer.files));
          }}
          onClick={() => document.getElementById('bulk-image-input')?.click()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-background">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Drag &amp; drop images here</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              or click to browse — JPG, PNG, WebP, GIF up to 5 MB each
            </p>
          </div>
          <input
            id="bulk-image-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFilesAdded(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>

        {/* Image rows */}
        {images.length > 0 && (
          <div className="space-y-3">
            {images.map((image, index) => (
              <div
                key={image.key}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {image.isUploading ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : image.previewUrl || image.imageUrl ? (
                    <img
                      src={image.previewUrl || image.imageUrl}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Replace-file overlay */}
                  {!image.isUploading && (
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/50 hover:opacity-100">
                      <Upload className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) handleReplaceFile(image.key, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* URL input */}
                <div className="flex flex-1 flex-col gap-1.5">
                  <Input
                    value={image.imageUrl}
                    onChange={(e) =>
                      setImages((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, imageUrl: e.target.value, previewUrl: undefined } : item
                        )
                      )
                    }
                    placeholder="https://example.com/photo.jpg  (or upload above)"
                    className="h-9 font-mono text-xs"
                  />
                  {image.uploadError && (
                    <p className="text-xs text-destructive">{image.uploadError}</p>
                  )}
                  {image.isUploading && (
                    <p className="animate-pulse text-xs text-muted-foreground">Uploading…</p>
                  )}
                </div>

                {/* Sort order */}
                <div className="w-16 flex-shrink-0">
                  <Input
                    type="number"
                    min="0"
                    value={image.sortOrder}
                    onChange={(e) =>
                      setImages((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, sortOrder: e.target.value } : item
                        )
                      )
                    }
                    className="h-9 text-center text-sm"
                    title="Sort order"
                  />
                </div>

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setImages((current) => current.filter((item) => item.key !== image.key))
                  }
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No images yet — drag &amp; drop files above or add a row to paste a URL.
          </p>
        )}
      </Section>

      {/* ── Options ──────────────────────────────────────────────────────── */}
      <Section
        label="Options"
        title="Variant dimensions"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setOptions((current) => [...current, { key: crypto.randomUUID(), name: '', valuesText: '' }])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </Button>
        }
      >
        {options.length ? (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div
                key={option.key}
                className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_2fr_auto]"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Option name</Label>
                  <Input
                    value={option.name}
                    onChange={(e) =>
                      setOptions((current) =>
                        current.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                      )
                    }
                    placeholder="Color"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Values (press Enter to add)</Label>
                  <div className="flex flex-wrap gap-1.5 p-1.5 border border-input rounded-md min-h-[36px] bg-background focus-within:ring-1 focus-within:ring-ring">
                    {option.valuesText.split(',').map(v => v.trim()).filter(Boolean).map((val, vIdx) => (
                      <span key={vIdx} className="inline-flex items-center gap-1 bg-stone-100 text-stone-900 px-2 py-0.5 rounded-sm text-xs font-medium">
                        {val}
                        <button type="button" onClick={() => {
                          const newVals = option.valuesText.split(',').map(v => v.trim()).filter(Boolean);
                          newVals.splice(vIdx, 1);
                          setOptions(curr => curr.map((item, i) => i === index ? { ...item, valuesText: newVals.join(', ') } : item));
                        }} className="text-stone-400 hover:text-stone-900 focus:outline-none">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-1 py-0.5"
                      placeholder={option.valuesText ? "" : "e.g. Red, Blue"}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            const currentVals = option.valuesText.split(',').map(v => v.trim()).filter(Boolean);
                            if (!currentVals.includes(val)) {
                               setOptions(curr => curr.map((item, i) => i === index ? { ...item, valuesText: [...currentVals, val].join(', ') } : item));
                            }
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            const currentVals = option.valuesText.split(',').map(v => v.trim()).filter(Boolean);
                            if (!currentVals.includes(val)) {
                               setOptions(curr => curr.map((item, i) => i === index ? { ...item, valuesText: [...currentVals, val].join(', ') } : item));
                            }
                            e.currentTarget.value = '';
                          }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add options if the product has variant dimensions like color or size.
          </p>
        )}
      </Section>

      {/* ── Variants ─────────────────────────────────────────────────────── */}
      <Section
        label="Variants"
        title="Sellable SKUs"
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateVariants}
              disabled={parsedOptions.length === 0}
              className="bg-stone-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Generate combinations
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVariants((current) => [...current, emptyVariant()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add variant
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.key} className="rounded-xl border bg-muted/20 p-4">
              {/* Generated SKU badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SKU</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {buildVariantSku(variant, index)}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Price (minor units)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={variant.priceMinor}
                    onChange={(e) =>
                      setVariants((current) =>
                        current.map((item, i) => (i === index ? { ...item, priceMinor: e.target.value } : item))
                      )
                    }
                    placeholder="12999"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Stock quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={variant.stockQty}
                    onChange={(e) =>
                      setVariants((current) =>
                        current.map((item, i) => (i === index ? { ...item, stockQty: e.target.value } : item))
                      )
                    }
                    placeholder="25"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Variant status</Label>
                  <Select
                    value={variant.status}
                    onValueChange={(val) =>
                      setVariants((current) =>
                        current.map((item, i) => (i === index ? { ...item, status: val } : item))
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {parsedOptions.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {parsedOptions.map((option) => (
                      <div key={option.name} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{option.name}</Label>
                        <Select
                          value={variant.selections[option.name] ?? ''}
                          onValueChange={(val) => updateVariantSelection(variant.key, option.name, val)}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder={`Select ${option.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {option.values.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {variants.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVariants((current) => current.filter((item) => item.key !== variant.key))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove variant
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Form-level error ─────────────────────────────────────────────── */}
      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* ── Bottom save button ───────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 pb-8">
        <Button type="submit" disabled={isPending} size="lg">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
