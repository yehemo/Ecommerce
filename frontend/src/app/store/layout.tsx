import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';

import { CartProvider } from '@/components/store/cart-provider';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
