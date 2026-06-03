import { ProductListing } from '@/components/store/product-listing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Arrivals | LYH',
  description: 'Shop the latest new arrivals at LYH.',
};

export default function NewArrivalPage() {
  return <ProductListing title="New Arrivals" baseQuery="is_new_arrival=true" />;
}