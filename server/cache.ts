/**
 * Redis-compatible caching interface, in-flight request coalescing,
 * exponential backoff retry, and circuit breaker for external providers.
 */

export interface CacheStore {
  get<T>(key: string): Promise<{ value: T; stale: boolean } | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  getStats(): { hits: number; misses: number; entries: number };
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  async get<T>(key: string): Promise<{ value: T; stale: boolean } | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    const now = Date.now();
    if (now <= entry.expiresAt) {
      this.hits += 1;
      return { value: entry.value as T, stale: false };
    }
    if (now <= entry.staleUntil) {
      return { value: entry.value as T, stale: true };
    }
    this.store.delete(key);
    this.misses += 1;
    return null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      // Keep stale copy for 2 hours as circuit-breaker fallback
      staleUntil: now + Math.max(ttlMs * 8, 2 * 60 * 60 * 1000),
    });
  }

  getStats(): { hits: number; misses: number; entries: number } {
    return { hits: this.hits, misses: this.misses, entries: this.store.size };
  }
}

export class RequestCoalescer {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 250
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60_000
  ) {}

  isOpen(): boolean {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt > this.cooldownMs) {
      this.openedAt = null;
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
    }
  }
}
