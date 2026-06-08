import { redirect } from 'next/navigation';

/**
 * Root page — immediately redirect to the store front.
 */
export default function RootPage() {
  redirect('/store');
}
