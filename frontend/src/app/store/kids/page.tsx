import { ProductListing } from '@/components/store/product-listing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kids | LYH',
  description: 'Shop the kids\' collection at LYH.',
};

export default function KidsPage() {
  return <ProductListing title="Kids" baseQuery="category_name=Kids" />;
}