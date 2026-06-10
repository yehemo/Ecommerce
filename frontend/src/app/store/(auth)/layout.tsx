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
      {/* Centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
