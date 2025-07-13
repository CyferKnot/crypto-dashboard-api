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
