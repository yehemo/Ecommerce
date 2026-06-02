import { CategoryEditor } from '@/components/admin/category-editor';

export default async function EditAdminCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  return <CategoryEditor mode="edit" categoryId={categoryId} />;
}
