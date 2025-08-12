//routes/horldings.js
import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

// Return distinct token symbols from holdings (for the datalist)
router.get('/', async (req, res) => {
  const db = await getDB();
  try {
    const rows = await db.all(`
      SELECT 
        coalesce(coingecko_id, token_symbol || ':' || token_address || ':' || chain) AS group_key,
        MAX(token_symbol) AS token_symbol,
        MAX(token_address) AS token_address,
        coingecko_id,
        MAX(chain) AS chain,
        SUM(balance) AS balance,
        MAX(usd_price) AS usd_price,
        SUM(usd_value) AS usd_value,
        COUNT(DISTINCT wallet_address) as wallet_count
      FROM holdings
      GROUP BY group_key
      ORDER BY usd_value DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching holdings:', err);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

export default router;
