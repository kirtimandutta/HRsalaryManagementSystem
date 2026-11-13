"use client";

import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl font-medium">The workspace could not load this view</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{error.message}</p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
