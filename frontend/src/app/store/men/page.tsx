import { ProductListing } from '@/components/store/product-listing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Men | LYH',
  description: 'Shop the men\'s collection at LYH.',
};

export default function MenPage() {
  return <ProductListing title="Men" baseQuery="category_name=Men" />;
}