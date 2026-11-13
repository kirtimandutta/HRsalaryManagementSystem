const buckets = new Map<string, Promise<unknown>>();

export function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = buckets.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = load().catch((error: unknown) => {
    buckets.delete(key);
    throw error;
  });
  buckets.set(key, pending);
  return pending;
}

export function invalidatePayrollCache(): void {
  buckets.clear();
}
