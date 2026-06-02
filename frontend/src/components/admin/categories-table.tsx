'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/axios';

type Category = {
  id: string;
  name: string;
  is_active: boolean;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Array<{ id: string }>;
};

type CategoryResponse = {
  data: Category[];
};

const fetcher = (url: string) => axios.get(url).then((res) => res.data as CategoryResponse);

export function CategoriesTable() {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, error, mutate, isLoading } = useSWR('/api/categories?per_page=100', fetcher);

  const deleteCategory = async (categoryId: string) => {
    const confirmed = window.confirm('Delete this category? Categories with assigned products cannot be removed.');

    if (!confirmed) return;

    setDeleteError(null);
    setIsDeleting(categoryId);

    try {
      await axios.get('/sanctum/csrf-cookie');
      await axios.delete(`/api/categories/${categoryId}`);
      await mutate();
    } catch (requestError: any) {
      setDeleteError(requestError.response?.data?.message ?? 'Failed to delete category.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-stone-300">Loading categories…</div>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-8 text-red-200">Failed to load categories.</div>;
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Taxonomy</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Manage categories</h2>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
        >
          Add category
        </Link>
      </div>

      {deleteError ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {deleteError}
        </div>
      ) : null}

      <div className="divide-y divide-white/10">
        {data?.data.length ? (
          data.data.map((category) => (
            <article
              key={category.id}
              className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="truncate text-lg font-medium text-white">{category.name}</h3>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-400">
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-400">
                  <span>Parent: {category.parent?.name ?? 'Root category'}</span>
                  <span>Children: {category.children?.length ?? 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/admin/categories/${category.id}/edit`}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteCategory(category.id)}
                  disabled={isDeleting === category.id}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting === category.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="px-6 py-10 text-center text-stone-400">No categories found.</div>
        )}
      </div>
    </div>
  );
}
