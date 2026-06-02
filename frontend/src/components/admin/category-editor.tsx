'use client';

import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
};

type CategoryEditorProps = {
  mode: 'create' | 'edit';
  categoryId?: string;
};

type ApiValidationErrors = Record<string, string[]>;

export function CategoryEditor({ mode, categoryId }: CategoryEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<ApiValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [categoriesResponse, categoryResponse] = await Promise.all([
          axios.get('/api/categories?per_page=100'),
          mode === 'edit' && categoryId ? axios.get(`/api/categories/${categoryId}`) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        const categoryItems = categoriesResponse.data.data as Category[];
        setCategories(categoryItems);

        if (categoryResponse) {
          const payload = categoryResponse.data.data as Category;
          setName(payload.name);
          setParentId(payload.parent_id ?? '');
          setIsActive(payload.is_active);
        }
      } catch {
        if (mounted) {
          setFormError('Failed to load category data.');
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
  }, [categoryId, mode]);

  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== categoryId),
    [categories, categoryId]
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    try {
      await axios.get('/sanctum/csrf-cookie');

      const payload = {
        name,
        parent_id: parentId || null,
        is_active: isActive,
      };

      if (mode === 'create') {
        await axios.post('/api/categories', payload);
      } else {
        await axios.patch(`/api/categories/${categoryId}`, payload);
      }

      startTransition(() => {
        router.push('/admin/categories');
        router.refresh();
      });
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {});
        setFormError(error.response.data.message ?? null);
        return;
      }

      setFormError('Unable to save the category right now.');
    }
  };

  if (isBootstrapping) {
    return <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-stone-300">Loading category editor…</div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">
              {mode === 'create' ? 'New Category' : 'Edit Category'}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {mode === 'create' ? 'Shape the catalog hierarchy' : 'Update category details'}
            </h2>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving…' : mode === 'create' ? 'Create category' : 'Save changes'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm text-stone-300">
            <span>Category name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
              placeholder="Outerwear"
            />
            {errors.name && <p className="text-sm text-red-300">{errors.name[0]}</p>}
          </label>

          <label className="space-y-2 text-sm text-stone-300">
            <span>Parent category</span>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-white outline-none transition focus:border-white/30"
            >
              <option value="">Root category</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.parent_id && <p className="text-sm text-red-300">{errors.parent_id[0]}</p>}
          </label>
        </div>

        <div className="mt-6">
          <label className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-stone-950/60 px-4 py-3 text-sm text-stone-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-stone-900 text-emerald-400 focus:ring-emerald-400"
            />
            Active category
          </label>
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
