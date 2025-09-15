// services/wallet.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { solanaTokenMap } from '../data/solanaTokenMap.js';
import { suiTokenMap } from '../data/suiTokenMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const coingeckoMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/coingecko-map.json'), 'utf8'));

const BLACKLISTED_ADDRESSES = new Set([
  '0x73454acfddb7a36a3cd8eb171fbea86c6a55e550' // Fake BUILD
]);

export const EVM_CHAINS = new Set(['eth','arbitrum','optimism','base','polygon','bsc']);

export const SOLANA_MINT_MAP = {
  // Symbol: Mint Address
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'ZEUS': 'ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq',
  'ATR': 'ATRLuHph8dxnPny4WSNW7fxkhbeivBrtWbY6BfB4xpLj',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'IO': 'GEdBv2DnES89DvasmZ35TaxP9kBibznYKbacXpoGTEBU'
};

function normalizeAddress(addr, chain) {
  if (!addr) return addr;
  return EVM_CHAINS.has(chain) ? addr.toLowerCase() : addr; // do NOT lowercase Solana
}


export async function scanWallet(address, chain = 'eth', coingeckoMap = {}) {
  console.log(`🧐 Scanning ${address} on ${chain}`);
  if (!EVM_CHAINS.has(chain)) {
    console.log(`Detected Solana scan for ${address}`);
  }

  if (EVM_CHAINS.has(chain)) return scanEvmWallet(address, chain, coingeckoMap);
  if (chain === 'sol') return scanSolWallet(address, coingeckoMap);
  if (chain === 'sui') return await scanSuiWallet(address, chain, coingeckoMap);
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
      // const keyExact = `${t.symbol?.toUpperCase()}:${t.token_address?.toLowerCase()}`;
      // const id = coingeckoMap[keyExact] || coingeckoMap[t.symbol?.toUpperCase()] || null;
      const id = getCoinGeckoId(t.symbol, t.token_address, coingeckoMap);
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
  const MINT_TO_SYMBOL = Object.fromEntries(Object.entries(SOLANA_MINT_MAP).map(([sym, mint]) => [mint, sym]));
  if (!apiKey) throw new Error('Missing HELIUS_API_KEY');

  const url = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${apiKey}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Helius error: ${res.status} - ${txt}`);
  }
  const data = await res.json();
  console.log('Helius tokens:', data);
  const out = [];

  // Native SOL
  if (data.nativeBalance) {
    const lamports = Number(data.nativeBalance ?? 0);
    console.log('raw nativeBalance.lamports:', data.nativeBalance);
    console.log('typeof nativeBalance.lamports:', typeof data.nativeBalance);
    const solBal = lamports / 1_000_000_000; // 9 decimals
    console.log('🪙 Native balance in SOL:', solBal, '(formatted:', solBal.toFixed(9) + ')');
    if (solBal > 0) {
      console.log('✅ Pushing SOL with balance', solBal);
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

    let sym = cleanSymbol(
      MINT_TO_SYMBOL[mint] ||
      t.symbol ||
      t.ticker ||
      t.tokenInfo?.symbol ||
      (t.name ? t.name.toUpperCase() : 'TOKEN')
    );

    const meta = solanaTokenMap[mint];
    const symbol = meta?.symbol || sym;
    const name = meta?.name || t.name || 'Unknown Token';

    // const keyExact = `${sym}:${mint.toLowerCase()}`;
    // const id = meta?.coingecko_id || coingeckoMap[keyExact] || coingeckoMap[sym] || null;
    const id = getCoinGeckoId(symbol, mint, coingeckoMap);


    // console.log('🧪 Checking coingecko lookup with:', keyExact);
    // console.log('Available keys in map:', Object.keys(coingeckoMap));

    console.log('✅ Final token entry:', {
      symbol,
      name,
      coingecko_id: id,
      mint,
    });

    if (!id) {
      console.warn(`Missing CoinGecko ID for ${sym} (${mint})`);
    }

    out.push({
      address: mint,
      symbol: sym,
      name,
      balance: bal,
      usd_price: 0,
      usd_value: 0,
      coingecko_id: id,
    });
  }

  console.log('Returning tokens:', out.map(t => ({
    symbol: t.symbol,
    balance: t.balance,
    coingecko_id: t.coingecko_id
  })));

  // console.log('🧾 Final tokens list:', out);

  return out;
}

function cleanSymbol(sym) {
  if (!sym) return 'TOKEN';
  return sym.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export async function scanSuiWallet(address, chain = 'sui', coingeckoMap = {}) {
  const out = [];
  if (!address) return out;

  const url = 'https://rpc.mainnet.sui.io';
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'suix_getAllBalances',
    params: [address]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.warn(`Suiscan error for ${address}: ${res.status}`);
    return out;
  }

  const text = await res.text();
  console.log(`📡 SUI response: ${text}`);
  if (!text || text.trim() === '') {
    console.warn(`Sui RPC returned empty response for ${address}`);
    return out;
  }

  let tokens;
  try {
    const parsed = JSON.parse(text);
    tokens = parsed?.result || [];
  } catch (err) {
    console.error(`Failed to parse Sui token response:`, text);
    console.error(err);
    return out;
  }

  for (const t of tokens) {
    const { coinType: coin_type, totalBalance: total_balance } = t;

    let normalizedCoinType = coin_type.toLowerCase();

    // 🔧 Normalize known SUI native coin format
    if (normalizedCoinType === '0x2::sui::sui') {
      normalizedCoinType = '0x2';
    }

    const meta = suiTokenMap[coin_type] || {};
    const {
      symbol = 'TOKEN',
      name,
      coingecko_id = null,
      decimals = 9
    } = meta;

    const balance = parseFloat(total_balance) / 10 ** decimals;

    // const keyExact = `${symbol.toUpperCase()}:${normalizedCoinType}`;
    // const id = coingeckoMap[keyExact] || coingeckoMap[symbol.toUpperCase()] || null;
    const id = getCoinGeckoId(symbol, coin_type, coingeckoMap);

    // Debug logs
    // console.log('🧪 Comparing:', keyExact, '===', Object.keys(coingeckoMap).find(k => k === keyExact));
    // console.log('🧪 [SUI] coingecko lookup with:', keyExact);
    console.log('✅ [SUI] Final token entry:', {
      symbol,
      name: name || symbol,
      coingecko_id: id,
      coin_type
    });

    if (!id) {
      console.warn(`🛑 No CoinGecko ID found for ${symbol} (${coin_type})`);
    }

    out.push({
      address: coin_type,
      symbol,
      name: name || symbol,
      balance,
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

// Add this helper to get token metadata
async function fetchSolanaTokenMetadata(mint) {
  const apiKey = process.env.HELIUS_API_KEY;
  const url = `https://api.helius.xyz/v0/tokens/metadata?api-key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mintAccounts: [mint] })
  });

  if (!res.ok) {
    console.warn(`⚠️ Metadata fetch failed for ${mint}:`, await res.text());
    return {};
  }

  const result = await res.json();
  return result?.[0] || {};
}

function getCoinGeckoId(symbol, coinType, coingeckoMap) {
  const sym = symbol?.toUpperCase() ?? 'TOKEN';
  const ct = coinType?.toLowerCase() ?? '';

  // Try exact match first (symbol + full coinType)
  const keyExact = `${sym}:${ct}`;
  if (coingeckoMap[keyExact]) return coingeckoMap[keyExact];

  // Try fallback to symbol + short coinType (if base address only)
  const base = ct.split('::')[0];
  const keyShort = `${sym}:${base}`;
  if (coingeckoMap[keyShort]) return coingeckoMap[keyShort];

  // Try just symbol
  if (coingeckoMap[sym]) return coingeckoMap[sym];

  return null;
}


