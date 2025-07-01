// services/coingecko.js
import fetch from 'node-fetch';
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function getPrices(idsParam) {
  const ids = idsParam.split(',').map(id => id.trim().toLowerCase());
  const now = Date.now();
  const results = {};
  const idsToFetch = [];

  ids.forEach(id => {
    const cached = cache.get(id);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      results[id] = { usd: cached.value };
    } else {
      idsToFetch.push(id);
    }
  });

  if (idsToFetch.length > 0) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(',')}&vs_currencies=usd`;
    const response = await fetch(url);
    const data = await response.json();
    idsToFetch.forEach(id => {
      if (data[id] && data[id].usd !== undefined) {
        cache.set(id, { value: data[id].usd, timestamp: now });
        results[id] = { usd: data[id].usd };
      }
    });
  }

  return results;
}

export async function getHistory(id, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }
  return await response.json();
}
