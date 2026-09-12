'use client'
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section role="alert" className="max-w-md rounded-2xl border border-border bg-white p-8 text-center"><h1 className="font-heading text-3xl">We could not load this page</h1><p className="mt-4 text-text-secondary">Please try again. If the problem continues, contact support.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-gold px-5 py-3 font-semibold text-navy">Try again</button><a href="/contact" className="mt-4 block underline">Contact support</a></section></main>
}
