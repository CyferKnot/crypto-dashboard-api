// services/wallet.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coingeckoMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/coingecko-map.json'), 'utf8'));

const BLACKLISTED_ADDRESSES = new Set([
  '0x73454acfddb7a36a3cd8eb171fbea86c6a55e550' // Fake BUILD
]);

export async function scanWallet(address, chain = 'eth') {
  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=${chain}`;

  const response = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': MORALIS_API_KEY,
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moralis error: ${response.status} - ${text}`);
  }

  const json = await response.json();
  const spamIndicators = [
    'claim',
    'reward',
    'rewards',
    'gift',
    'airdrop',
    'ticket',
    'https://',
    'receive at',
    'get $',
    'earn $',
    'event at',
    '.org',
    '.com',
    '.fi',
  ];

  function isSpamToken(name = '') {
    const lower = name.toLowerCase();
    return spamIndicators.some(indicator => lower.includes(indicator));
  }

  json.result.forEach(t => {
    const bal = parseFloat(t.balance_formatted);
    if (bal === 0 || isSpamToken(t.name)) {
      console.log(`Filtered: ${t.name || 'Unnamed'} – Balance: ${bal}`);
    }
  });


  return json.result
    .filter(t => {
      const balance = parseFloat(t.balance_formatted);
      return balance > 0 && !isSpamToken(t.name) && !BLACKLISTED_ADDRESSES.has(t.token_address?.toLowerCase());
    })
    .map(t => {
      const key = `${t.symbol?.toUpperCase()}:${t.token_address?.toLowerCase()}`;
      const coingecko_id = coingeckoMap[key] || coingeckoMap[t.symbol?.toUpperCase()] || null;
      return {
        address: t.token_address,
        symbol: t.symbol,
        name: t.name,
        balance: t.balance_formatted,
        usd_price: t.usd_price,
        usd_value: t.usd_value,
        logo: t.logo,
        possible_spam: t.possible_spam,
        verified: t.verified_contract,
        native: t.native_token,
        coingecko_id
      }
    });
  }

