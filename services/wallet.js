// services/wallet.js
import fetch from 'node-fetch';


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
  return json.result.map(t => ({
    address: t.token_address,
    symbol: t.symbol,
    name: t.name,
    balance: t.balance_formatted,
    usd_price: t.usd_price,
    usd_value: t.usd_value,
    logo: t.logo,
    possible_spam: t.possible_spam,
    verified: t.verified_contract,
    native: t.native_token
  }));
}
