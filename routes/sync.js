// routes/sync.js
import express from 'express';
import { getCoinGeckoMapObject } from '../services/settings.js';
import { scanWallet, EVM_CHAINS } from '../services/wallet.js';
import { getDB } from '../db/db.js';
import { getPrices } from '../services/coingecko.js';
import { resolveCoingeckoId } from '../services/tokens.js'; 

const router = express.Router();

router.post('/sync-wallets', async (req, res) => {
  const db = await getDB();
  const allHoldings = [];
  try {
    const wallets = await db.all(`SELECT address, chain FROM wallets`);
    console.log('Wallets found:', wallets);
    if (!wallets.length) return res.status(400).json({ error: 'No wallets found' });

    // 🔹 Load map from DB (not JSON file)
    const cgMap = await getCoinGeckoMapObject();

    const allTokens = [];
    for (const { address, chain } of wallets) {
      console.log(`Scanning wallet ${address} on chain in push ${chain}`);
      const tokens = await scanWallet(address, chain, cgMap); // pass map in
      allTokens.push(...tokens);
    }

    const uniqueIds = [...new Set(allTokens.map(t => t.coingecko_id).filter(Boolean))];
    const priceMap = await getPrices(uniqueIds); // your batched version

    for (const { address, chain } of wallets) {
      console.log(`Scanning wallet ${address} on chain in insert ${chain}`);
      const tokens = await scanWallet(address, chain, cgMap);

      for (const token of tokens) {
        const price = token.coingecko_id ? (priceMap[token.coingecko_id]?.usd || 0) : 0;
        const usd_value = parseFloat(token.balance) * price;

        if (!token.symbol || price <= 0 || usd_value <= 0) continue;

        const normalizedAddr = EVM_CHAINS.has(chain) ? token.address.toLowerCase() : token.address;

        await db.run(`
          INSERT INTO holdings (wallet_address, token_symbol, token_address, balance, usd_price, usd_value, coingecko_id, chain)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(wallet_address, token_address, chain) DO UPDATE SET
            balance = excluded.balance,
            usd_price = excluded.usd_price,
            usd_value = excluded.usd_value,
            coingecko_id = excluded.coingecko_id
        `, [
          address.toLowerCase(),
          token.symbol?.toUpperCase(),
          normalizedAddr,
          parseFloat(token.balance),
          price,
          usd_value,
          token.coingecko_id,      // will now be 'artificial-superintelligence-alliance' for FET
          chain
        ]);

        allHoldings.push({
          wallet: address,
          chain,
          ...token,
          usd_price: price,
          usd_value
        });
      }
    }

    // await db.run(`DELETE FROM holdings WHERE usd_value = 0 OR balance = 0`);

    res.json({ ok: true, holdings: allHoldings });
  } catch (e) {
    console.error('Wallet sync error:', e);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
