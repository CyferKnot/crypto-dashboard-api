// services/coingecko.js
import fetch from 'node-fetch';

const cache = new Map();              // id -> { value, timestamp }
const failCooldown = new Map();       // id -> lastFailTs

const CACHE_TTL = 60 * 1000;          // 60s cache
const COOLDOWN_MS = 5 * 60 * 1000;    // 5m cooldown per id after miss/429
const CHUNK = 50;                     // ids per request
const MAX_RETRY = 3;
const BASE_WAIT = 1200;               // ms between retries/chunks

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * idsParam: string like "eth,bitcoin" OR array ["eth","bitcoin"]
 * returns: { id: { usd: number } }
 */
export async function getPrices(idsParam) {
  // normalize input -> array of lowercase ids
  const input = Array.isArray(idsParam)
    ? idsParam
    : String(idsParam || '').split(',');

  const ids = [...new Set(input.map(s => s.trim().toLowerCase()).filter(Boolean))];
  console.log('🐛 coingecko.js::getPrices called for:', ids);

  const now = Date.now();
  const results = {};
  const toFetch = [];

  // serve from cache or decide to fetch
  for (const id of ids) {
    const c = cache.get(id);
    if (c && (now - c.timestamp) < CACHE_TTL) {
      results[id] = { usd: c.value };
      continue;
    }
    // respect cooldown for recent failures/misses
    const lastFail = failCooldown.get(id);
    if (lastFail && (now - lastFail) < COOLDOWN_MS) {
      // keep whatever we had (if any) and skip refetching now
      if (c) results[id] = { usd: c.value };
      continue;
    }
    toFetch.push(id);
  }

  // chunk fetch with backoff
  for (let i = 0; i < toFetch.length; i += CHUNK) {
    const group = toFetch.slice(i, i + CHUNK);
    let attempt = 0;

    while (attempt < MAX_RETRY) {
      attempt++;
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(group.join(','))}&vs_currencies=usd`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });

      if (res.status === 429) {
        const wait = BASE_WAIT * attempt;
        console.warn(`CoinGecko 429 for chunk; retrying in ${wait}ms`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        console.error(`CoinGecko error ${res.status}: ${await res.text()}`);
        // mark all in this chunk as failed (cooldown)
        const ts = Date.now();
        for (const id of group) failCooldown.set(id, ts);
        break; // break retry loop for this chunk
      }

      const json = await res.json();
      const ts = Date.now();

      for (const id of group) {
        const got = json?.[id]?.usd;
        if (got != null) {
          cache.set(id, { value: got, timestamp: ts });
          results[id] = { usd: got };
          // clear fail flag if it existed
          if (failCooldown.has(id)) failCooldown.delete(id);
        } else {
          // no price returned -> cool down this id
          failCooldown.set(id, ts);
          // if we had a cached value, serve it; else omit
          const c = cache.get(id);
          if (c) results[id] = { usd: c.value };
          console.warn(`No CG price for "${id}", cooling down ${Math.round(COOLDOWN_MS/60000)}m`);
        }
      }

      await sleep(BASE_WAIT); // space out between chunks
      break; // chunk done
    }
  }

  return results;
}

export async function getHistory(id, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch history: ${response.statusText}`);
  return await response.json();
}
