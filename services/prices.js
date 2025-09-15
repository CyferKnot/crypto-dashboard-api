// services/prices.js
import fetch from 'node-fetch';

const CG_BASE = 'https://api.coingecko.com/api/v3/simple/price';
const CHUNK = 50;
const BASE_WAIT = 1200; // ms between chunks
const MAX_RETRY = 3;

// Per-ID cooldown: don't refetch failing IDs for 5 minutes
const COOLDOWN_MS = 5 * 60 * 1000;
const lastFail = new Map(); // id -> timestamp

const sleep = ms => new Promise(r => setTimeout(r, ms));

// export async function getPrices(ids) {
//   const uniq = [...new Set(ids.filter(Boolean).map(s => s.toLowerCase()))];

//   // filter out IDs still cooling down
//   const now = Date.now();
//   const ready = uniq.filter(id => !lastFail.get(id) || (now - lastFail.get(id)) > COOLDOWN_MS);

//   const out = {};
//   for (let i = 0; i < ready.length; i += CHUNK) {
//     const group = ready.slice(i, i + CHUNK);
//     let attempt = 0;
//     while (attempt < MAX_RETRY) {
//       attempt++;
//       const url = `${CG_BASE}?ids=${encodeURIComponent(group.join(','))}&vs_currencies=usd`;
//       const res = await fetch(url, { headers: { accept: 'application/json' } });

//       if (res.status === 429) {
//         const wait = BASE_WAIT * attempt;
//         console.warn(`CG 429 on chunk; retrying in ${wait}ms`);
//         await sleep(wait);
//         continue;
//       }
//       if (!res.ok) {
//         console.error(`CG error ${res.status}: ${await res.text()}`);
//         break;
//       }

//       const json = await res.json();

//       // Record results & mark misses for cooldown
//       for (const id of group) {
//         if (json[id]?.usd != null) {
//           out[id] = { usd: json[id].usd };
//         } else {
//           // mark missing ones to avoid immediate re-query loops
//           lastFail.set(id, Date.now());
//           console.warn(`No price for id "${id}", cooling down ${COOLDOWN_MS/60000}m`);
//         }
//       }

//       await sleep(BASE_WAIT);
//       break;
//     }
//   }
//   return out;
// }
