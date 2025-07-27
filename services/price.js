// services/price.js
import fetch from 'node-fetch';

export async function fetchTokenPrice(coingeckoId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = await res.json();
  if (!json[coingeckoId]) throw new Error(`Invalid price data for ${coingeckoId}`);
  return json[coingeckoId].usd;
}

// services/price.js
export async function fetchPrices(ids = []) {
  if (!ids.length) return {};

  const query = ids.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${query}&vs_currencies=usd`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);

  return await res.json(); // { id1: { usd: 1.23 }, id2: { usd: 0.87 }, ... }
}

