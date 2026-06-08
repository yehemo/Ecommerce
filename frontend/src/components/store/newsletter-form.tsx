'use client';

export function NewsletterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up newsletter subscription API
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-2 w-full max-w-md"
    >
      <input
        type="email"
        placeholder="your@email.com"
        className="flex-1 bg-transparent border border-stone-700 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-stone-400 transition-colors"
      />
      <button
        type="submit"
        className="bg-white text-black text-sm font-medium tracking-[0.1em] uppercase rounded-full px-6 py-2.5 hover:bg-stone-200 transition-colors whitespace-nowrap"
      >
        Subscribe
      </button>
    </form>
  );
}
