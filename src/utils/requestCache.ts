interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class ReadRequestCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();

  async run<T>(key: string, ttlMs: number, loader: () => Promise<T>, force = false): Promise<T> {
    const now = Date.now();
    const cached = this.entries.get(key);
    if (!force && cached && cached.expiresAt > now) return cached.value as T;

    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;

    const request = loader();
    this.pending.set(key, request);
    try {
      const value = await request;
      this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      if (this.pending.get(key) === request) this.pending.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export function stableRequestKey(action: string, body: Record<string, unknown>): string {
  const normalized = Object.keys(body).sort().reduce<Record<string, unknown>>((result, key) => {
    if (body[key] !== undefined && key !== 'since') result[key] = body[key];
    return result;
  }, {});
  return `${action}:${JSON.stringify(normalized)}`;
}
