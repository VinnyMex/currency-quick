import { storage } from './storage.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getCached(base, quote) {
  const key = `rates:${base}:${quote}`;
  const cached = await storage.get(key);
  if (!cached) return null;
  if (Date.now() > new Date(cached.expiresAt).getTime()) return null;
  return cached;
}

export async function setCached(base, quote, rate, provider, ttlMs = DEFAULT_TTL_MS) {
  const key = `rates:${base}:${quote}`;
  const now = new Date();
  const entry = {
    base,
    quote,
    rate,
    provider,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString()
  };
  await storage.set(key, entry);
  return entry;
}

export async function getLastCached(base, quote) {
  const key = `rates:${base}:${quote}`;
  return await storage.get(key);
}
