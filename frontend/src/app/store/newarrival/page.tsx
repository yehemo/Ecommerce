import { ProductListing } from '@/components/store/product-listing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Arrivals | CamboShop',
  description: 'Shop the latest new arrivals at CamboShop.',
};

export default function NewArrivalPage() {
  return <ProductListing title="New Arrivals" baseQuery="is_new_arrival=true" />;
}
