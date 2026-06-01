import { ProductEditor } from '@/components/admin/product-editor';

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return <ProductEditor mode="edit" productId={productId} />;
}
