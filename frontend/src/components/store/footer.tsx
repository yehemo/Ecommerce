import Link from "next/link";

const navLinks = [
  { label: "New Arrival", href: "/newarrivals" },
  { label: "Women",      href: "/women" },
  { label: "Men",        href: "/men" },
  { label: "Kids",       href: "/kids" }
];

const legalLinks = [
  { label: "Privacy",  href: "#" },
  { label: "Terms",    href: "#" },
  { label: "Shipping", href: "#" },
];

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-stone-100">
      {/* Main footer body */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col items-center gap-12">

        {/* Brand wordmark */}
        <Link href="/">
          <span
            className="text-3xl md:text-4xl font-normal tracking-[0.4em] uppercase text-black"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            LYH
          </span>
        </Link>

        {/* Thin divider */}
        <div className="w-12 h-px bg-stone-200" />

        {/* Navigation links — horizontal */}
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[10px] tracking-[0.25em] uppercase text-stone-400 hover:text-black transition-colors duration-300"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Newsletter — one-line */}
        <div className="flex flex-col sm:flex-row items-center gap-0 border-b border-stone-300 w-full max-w-sm">
          <input
            type="email"
            placeholder="Your email address"
            className="flex-1 bg-transparent text-xs text-black placeholder:text-stone-300 outline-none py-2 tracking-wide w-full"
            style={{ fontFamily: "var(--font-sans)" }}
          />
          <button
            className="text-[10px] tracking-[0.25em] uppercase text-stone-500 hover:text-black transition-colors duration-300 py-2 whitespace-nowrap"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Subscribe
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-100 px-6 md:px-10 py-5">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-[10px] tracking-[0.15em] text-stone-300"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            © {new Date().getFullYear()} LYH. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[10px] tracking-[0.15em] uppercase text-stone-300 hover:text-black transition-colors duration-300"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
