// services/wallet.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const coingeckoMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/coingecko-map.json'), 'utf8'));

const BLACKLISTED_ADDRESSES = new Set([
  '0x73454acfddb7a36a3cd8eb171fbea86c6a55e550' // Fake BUILD
]);

export const EVM_CHAINS = new Set(['eth','arbitrum','optimism','base','polygon','bsc']);

function normalizeAddress(addr, chain) {
  if (!addr) return addr;
  return EVM_CHAINS.has(chain) ? addr.toLowerCase() : addr; // do NOT lowercase Solana
}


export async function scanWallet(address, chain = 'eth', coingeckoMap = {}) {
  if (EVM_CHAINS.has(chain)) return scanEvmWallet(address, chain, coingeckoMap);
  if (chain === 'sol') return scanSolWallet(address, coingeckoMap);
  throw new Error(`Unsupported chain: ${chain}`);
}

async function scanEvmWallet(address, chain, coingeckoMap) {
  // ... fetch from Moralis (unchanged)
  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=${chain}`;

  const response = await fetch(url, {
    headers: { 'accept': 'application/json', 'X-API-Key': MORALIS_API_KEY }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moralis error: ${response.status} - ${text}`);
  }

  const json = await response.json();

  // Load spam indicators from DB
  const spamIndicators = await loadSpamIndicators();

  const isSpamToken = (name = '') => {
    const lower = (name || '').toLowerCase();
    return spamIndicators.some(ind => lower.includes(ind));
  };



  return json.result
    .filter(t => {
      const bal = parseFloat(t.balance_formatted);
      return bal > 0 && !isSpamToken(t.name);
    })
    .map(t => {
      const keyExact = `${t.symbol?.toUpperCase()}:${t.token_address?.toLowerCase()}`;
      const id = coingeckoMap[keyExact] || coingeckoMap[t.symbol?.toUpperCase()] || null;
      return {
        address: normalizeAddress(t.token_address, chain),
        symbol: t.symbol,
        name: t.name,
        balance: t.balance_formatted,
        usd_price: t.usd_price,
        usd_value: t.usd_value,
        logo: t.logo,
        possible_spam: t.possible_spam,
        verified: t.verified_contract,
        native: t.native_token,
        coingecko_id: id
      };
    });
}

// --- Solana via Helius ---
async function scanSolWallet(address, coingeckoMap = {}) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('Missing HELIUS_API_KEY');

  const url = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Helius error: ${res.status} - ${txt}`);
  }
  const data = await res.json();

  const out = [];

  // Native SOL
  if (data.nativeBalance) {
    const lamports = Number(data.nativeBalance.lamports ?? 0);
    const solBal = lamports / 1_000_000_000; // 9 decimals
    if (solBal > 0) {
      out.push({
        address: 'So11111111111111111111111111111111111111112', // canonical SOL mint
        symbol: 'SOL',
        name: 'Solana',
        balance: solBal,
        usd_price: 0,
        usd_value: 0,
        coingecko_id: coingeckoMap['SOL'] || 'solana'
      });
    }
  }

  // SPL tokens
  for (const t of (data.tokens || [])) {
    const mint = t.mint;
    const decimals = Number(t.decimals ?? 0);
    const raw = Number(t.amount ?? 0);
    const bal = decimals ? raw / Math.pow(10, decimals) : raw;
    if (bal <= 0) continue;

    const sym = (t.symbol || t.ticker || (t.name ? t.name.toUpperCase() : 'TOKEN')).toUpperCase();
    const keyExact = `${sym}:${mint}`;
    const id = coingeckoMap[keyExact] || coingeckoMap[sym] || null;

    out.push({
      address: mint, // DO NOT lowercase
      symbol: sym,
      name: t.name || sym,
      balance: bal,
      usd_price: 0,
      usd_value: 0,
      coingecko_id: id
    });
  }

  return out;
}

// Optional: spam indicators via API backed by your settings table
async function loadSpamIndicators() {
  try {
    const base = process.env.INTERNAL_BASE_URL || '';
    const res = await fetch(`${base}/api/settings/spam`);
    if (res.ok) return (await res.json()) || [];
  } catch {}
  // fallback
  return ['claim','reward','rewards','gift','airdrop','ticket','https://','receive at','get $','earn $','event at','.org','.com','.fi'];
}

// export async function scanWallet(address, chain = 'eth') {
//   const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
//   const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=${chain}`;

//   const response = await fetch(url, {
//     headers: {
//       'accept': 'application/json',
//       'X-API-Key': MORALIS_API_KEY,
//     }
//   });

//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`Moralis error: ${response.status} - ${text}`);
//   }

  // const json = await response.json();
  // const spamIndicators = [
  //   'claim',
  //   'reward',
  //   'rewards',
  //   'gift',
  //   'airdrop',
  //   'ticket',
  //   'https://',
  //   'receive at',
  //   'get $',
  //   'earn $',
  //   'event at',
  //   '.org',
  //   '.com',
  //   '.fi',
  // ];

  // function isSpamToken(name = '') {
  //   const lower = name.toLowerCase();
  //   return spamIndicators.some(indicator => lower.includes(indicator));
  // }

  // json.result.forEach(t => {
  //   const bal = parseFloat(t.balance_formatted);
  //   if (bal === 0 || isSpamToken(t.name)) {
  //     console.log(`Filtered: ${t.name || 'Unnamed'} – Balance: ${bal}`);
  //   }
  // });


  // return json.result
  //   .filter(t => {
  //     const balance = parseFloat(t.balance_formatted);
  //     return balance > 0 && !isSpamToken(t.name) && !BLACKLISTED_ADDRESSES.has(t.token_address?.toLowerCase());
  //   })
  //   .map(t => {
  //     const key = `${t.symbol?.toUpperCase()}:${t.token_address?.toLowerCase()}`;
  //     const coingecko_id = coingeckoMap[key] || coingeckoMap[t.symbol?.toUpperCase()] || null;
  //     return {
  //       address: t.token_address,
  //       symbol: t.symbol,
  //       name: t.name,
  //       balance: t.balance_formatted,
  //       usd_price: t.usd_price,
  //       usd_value: t.usd_value,
  //       logo: t.logo,
  //       possible_spam: t.possible_spam,
  //       verified: t.verified_contract,
  //       native: t.native_token,
  //       coingecko_id,
  //       chain: chain
  //     }
  //   });
  // }
  