/**
 * Auth layout — no header/footer, just a clean full-page centered shell.
 * This overrides the parent store/layout.tsx for the (auth) route group.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Minimal top bar with brand only */}
      <div className="w-full border-b border-stone-100 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <a
            href="/store"
            className="text-lg font-light tracking-[0.4em] uppercase text-black hover:opacity-60 transition-opacity"
          >
            CamboShop
          </a>
        </div>
      </div>

      {/* Centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Minimal footer */}
      <div className="w-full border-t border-stone-100 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-center">
          <p className="text-[10px] tracking-[0.15em] text-stone-300 uppercase">
            © {new Date().getFullYear()} CamboShop. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
