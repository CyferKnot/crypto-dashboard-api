// routes/sync.js
import express from 'express';
import { scanWallet } from '../services/wallet.js';
import { getDB } from '../db/db.js';
import { fetchPrices } from '../services/price.js';

const router = express.Router();

router.post('/sync-wallets', async (req, res) => {
  const db = await getDB();
  const allHoldings = [];

  try {
    const wallets = await db.all(`SELECT address, chain FROM wallets`);
    if (!wallets.length) return res.status(400).json({ error: 'No wallets found' });

    const allTokens = [];
    for (const { address, chain } of wallets) {
      const tokens = await scanWallet(address, chain);
      allTokens.push(...tokens);
    }

    const uniqueIds = [...new Set(allTokens.map(t => t.coingecko_id).filter(Boolean))];
    const priceMap = await fetchPrices(uniqueIds);

    for (const { address, chain } of wallets) {
      const tokens = await scanWallet(address, chain);

      for (const token of tokens) {
        // const price = token.coingecko_id ? await fetchPrices(token.coingecko_id) : 0;
        const price = priceMap[token.coingecko_id]?.usd || 0;
        const usd_value = parseFloat(token.balance) * price;

        // Skip unusable tokens
        if (!token.symbol || price <= 0 || usd_value <= 0) continue;

        await db.run(`
          INSERT INTO holdings (wallet_address, token_symbol, token_address, balance, usd_price, usd_value, coingecko_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(wallet_address, token_address) DO UPDATE SET
            balance = excluded.balance,
            usd_price = excluded.usd_price,
            usd_value = excluded.usd_value,
            coingecko_id = excluded.coingecko_id
        `, [
          address.toLowerCase(),
          token.symbol.toUpperCase(),
          token.address.toLowerCase(),
          parseFloat(token.balance),
          price,
          usd_value,
          token.coingecko_id
        ]);

        allHoldings.push({
          wallet: address,
          ...token,
          usd_price: price,
          usd_value
        });
      }
    }

    // Optional: cleanup zero-balance or zero-value entries
    await db.run(`DELETE FROM holdings WHERE usd_value = 0 OR balance = 0`);

    res.json(allHoldings);
  } catch (err) {
    console.error('Wallet sync error:', err);
    res.status(500).json({ error: 'Wallet sync failed' });
  }
});

export default router;
