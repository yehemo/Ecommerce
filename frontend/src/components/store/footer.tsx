import Link from "next/link";

const navLinks = [
  { label: "New Arrival", href: "/store/newarrival" },
  { label: "Women",      href: "/store/women" },
  { label: "Men",        href: "/store/men" },
  { label: "Kids",       href: "/store/kids" }
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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-16 md:py-20 flex flex-col items-center gap-12">

        {/* Brand wordmark */}
        <Link href="/">
          <span
            className="text-3xl md:text-4xl font-normal tracking-[0.4em] uppercase text-black"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            CamboShop
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
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-100 px-4 sm:px-6 lg:px-10 py-5">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-[10px] tracking-[0.15em] text-stone-300"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            © {new Date().getFullYear()} CamboShop. All rights reserved.
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
