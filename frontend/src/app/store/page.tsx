import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/store/newsletter-form';
import { ProductsGrid } from '@/components/store/products-grid';
import { StoreSearchResults } from '@/components/store/store-search-results';

export const metadata: Metadata = {
  title: 'CamboShop — Modern Fashion Store',
  description: 'Discover the latest fashion trends at CamboShop. Shop Women, Men, and Kids collections with free shipping on orders over $100.',
};

type Category = {
  label: string;
  href: string;
  image: string;
  textColor?: string;
};

const categories: Category[] = [
  { label: 'Women', href: '/store/women', image: '/category/women.jpg' },
  { label: 'Men', href: '/store/men', image: '/category/men.jpg' },
  { label: 'Kids', href: '/store/kids', image: '/category/kidv2.jpg' },
];

const perks = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Free Shipping',
    description: 'On all orders over $100',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: 'Easy Returns',
    description: '30-day hassle-free returns',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Secure Payment',
    description: '100% protected checkout',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: '24/7 Support',
    description: 'Expert help whenever you need',
  },
];

type StorePageProps = {
  searchParams?: Promise<{
    search?: string;
    sort?: string;
  }>;
};

export default async function StorePage({ searchParams }: StorePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = resolvedSearchParams?.search?.trim();
  const sort = resolvedSearchParams?.sort?.trim();

  if (search) {
    return <StoreSearchResults initialQuery={search} initialSort={sort || 'newest'} />;
  }

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative w-full bg-stone-950 text-white overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-32 md:py-44 flex flex-col items-center text-center gap-8">
          <span className="inline-block text-[10px] tracking-[0.35em] uppercase text-stone-400 border border-stone-700 rounded-full px-4 py-1.5">
            Summer 2026 Collection
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extralight tracking-[0.05em] leading-[0.95] max-w-3xl">
            Wear What<br />
            <em className="not-italic font-normal" style={{ fontStyle: 'italic' }}>Moves You</em>
          </h1>

          <p className="max-w-md text-base text-stone-400 leading-relaxed">
            Timeless pieces crafted with intention. Explore our latest collections for women, men, and kids.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/store/newarrival"
              className="px-8 py-3.5 bg-white text-black text-sm font-medium tracking-[0.1em] uppercase rounded-full hover:bg-stone-100 transition-colors"
            >
              Shop Now
            </Link>
            <Link
              href="#featured-pieces"
              className="px-8 py-3.5 border border-stone-600 text-stone-300 text-sm font-medium tracking-[0.1em] uppercase rounded-full hover:border-stone-400 hover:text-white transition-colors"
            >
              View Sale
            </Link>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-stone-50 to-transparent" />
      </section>

      {/* ── Categories ── */}
      <section className="max-w-screen-xl mx-auto px-6 lg:px-10 py-20 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-900">Shop by Category</h2>
          <div className="w-8 h-px bg-stone-300 mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group relative block cursor-pointer w-full"
            >
              <div className="relative overflow-hidden aspect-[1/1.3] md:aspect-[3/4]">
                <Image
                  src={category.image}
                  alt={category.label}
                  fill
                  className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                
                {/* Subtle overlay (darken on hover) */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500 z-10" />
                
                {/* Dark gradient vignette at the bottom for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 via-black/30 to-transparent z-[15]" />
              
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8 flex flex-col justify-end text-white">
                  <h3
                    className="text-3xl md:text-4xl font-normal"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {category.label}
                  </h3>
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase text-white/80 mt-1.5"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Shop Collection
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products (from API) ── */}
      <section id="featured-pieces" className="bg-stone-50 py-20">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-900">Featured Pieces</h2>
            <div className="w-8 h-px bg-stone-300 mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <ProductsGrid />
          </div>

          <div className="text-center mt-12">
            <Link
              href="/store/newarrival"
              className="inline-block px-8 py-3 border border-stone-300 text-stone-700 text-sm font-medium tracking-[0.1em] uppercase rounded-full hover:border-stone-900 hover:text-stone-900 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── Perks Banner ── */}
      <section className="border-y border-stone-100 py-14">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {perks.map((perk) => (
              <div key={perk.title} className="flex flex-col items-center text-center gap-3">
                <div className="text-stone-400">{perk.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 tracking-wide">{perk.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{perk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="bg-stone-950 text-white py-20">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 flex flex-col items-center text-center gap-6">
          <h2 className="text-3xl font-light tracking-[0.15em] uppercase">Join the Circle</h2>
          <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
            Subscribe for early access to new arrivals, exclusive offers, and style inspiration.
          </p>
          <NewsletterForm />
        </div>
      </section>

    </div>
  );
}
