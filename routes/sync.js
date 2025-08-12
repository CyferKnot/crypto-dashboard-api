// routes/sync.js
import express from 'express';
import { getCoinGeckoMapObject } from '../services/settings.js';
import { scanWallet, EVM_CHAINS } from '../services/wallet.js';
import { getDB } from '../db/db.js';
import { fetchPrices } from '../services/price.js';
import { resolveCoingeckoId } from '../services/tokens.js'; 

const router = express.Router();


router.post('/sync-wallets', async (req, res) => {
  const db = await getDB();
  const allHoldings = [];
  try {
    const wallets = await db.all(`SELECT address, chain FROM wallets`);
    if (!wallets.length) return res.status(400).json({ error: 'No wallets found' });

    // 🔹 Load map from DB (not JSON file)
    const cgMap = await getCoinGeckoMapObject();

    const allTokens = [];
    for (const { address, chain } of wallets) {
      const tokens = await scanWallet(address, chain, cgMap); // pass map in
      allTokens.push(...tokens);
    }

    const uniqueIds = [...new Set(allTokens.map(t => t.coingecko_id).filter(Boolean))];
    const priceMap = await fetchPrices(uniqueIds); // your batched version

    for (const { address, chain } of wallets) {
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

// router.post('/sync-wallets', async (req, res) => {
//   const db = await getDB();
//   const allHoldings = [];

//   try {
//     const wallets = await db.all(`SELECT address, chain FROM wallets`);
//     if (!wallets.length) return res.status(400).json({ error: 'No wallets found' });

//     const allTokens = [];
//     const walletTokensMap = {};

//     for (const { address, chain } of wallets) {
//       const tokens = await scanWallet(address, chain);
//       walletTokensMap[address] = { chain, tokens };
//       allTokens.push(...tokens);
//     }

//     const uniqueIds = [...new Set(allTokens.map(t => t.coingecko_id).filter(Boolean))];
//     console.log("Fetching CoinGecko prices for IDs:", uniqueIds);
//     const priceMap = await getPrices(uniqueIds);

//     for (const address in walletTokensMap) {
//       const { chain, tokens } = walletTokensMap[address];

//       for (const token of tokens) {
//         let coingecko_id = token.coingecko_id;

//         if (!coingecko_id) {
//           coingecko_id = await resolveCoingeckoId(token.symbol, token.address);
//         }

//         const price = token.coingecko_id ? (priceMap[token.coingecko_id]?.usd || 0) : 0;
//         const usd_value = parseFloat(token.balance) * price;


//         if (!token.symbol || price <= 0 || usd_value <= 0) continue;

//         await db.run(`
//           INSERT INTO holdings (wallet_address, token_symbol, token_address, balance, usd_price, usd_value, coingecko_id, chain)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//           ON CONFLICT(wallet_address, token_address, chain) DO UPDATE SET
//             balance = excluded.balance,
//             usd_price = excluded.usd_price,
//             usd_value = excluded.usd_value,
//             coingecko_id = excluded.coingecko_id
//         `, [
//           address.toLowerCase(),
//           token.symbol.toUpperCase(),
//           token.address.toLowerCase(),
//           parseFloat(token.balance),
//           price,
//           usd_value,
//           token.coingecko_id,
//           chain
//         ]);

//         allHoldings.push({
//           wallet: address,
//           ...token,
//           usd_price: price,
//           usd_value
//         });
//       }
//     }

//     // Optional: cleanup zero-balance or zero-value entries
//     await db.run(`DELETE FROM holdings WHERE usd_value = 0 OR balance = 0`);

//     res.json(allHoldings);
//   } catch (err) {
//     console.error('Wallet sync error:', err);
//     res.status(500).json({ error: 'Wallet sync failed' });
//   }
// });

export default router;
