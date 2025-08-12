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

export async function fetchPrices(ids = []) {
  if (!ids.length) return {};

  const query = ids.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${query}&vs_currencies=usd`;
  console.log('Fetching CoinGecko prices for:', query);

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text(); // Read the raw body
    throw new Error(`Price fetch failed: ${res.status} - ${text.slice(0, 200)}`);
  }

  return await res.json(); // Only called if .ok is true
}
