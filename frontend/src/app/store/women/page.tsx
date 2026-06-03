import { ProductListing } from '@/components/store/product-listing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Women | LYH',
  description: 'Shop the women\'s collection at LYH.',
};

export default function WomenPage() {
  return <ProductListing title="Women" baseQuery="category_name=Women" />;
}