import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

// Return distinct token symbols from holdings (for the datalist)
router.get('/', async (req, res) => {
  const db = await getDB();
  try {
    const rows = await db.all(`
      SELECT 
        token_symbol,
        token_address,
        coingecko_id,
        category,
        SUM(balance) AS balance,
        AVG(usd_price) AS usd_price,
        SUM(usd_value) AS usd_value
      FROM holdings
      GROUP BY token_symbol, token_address
      ORDER BY usd_value DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching holdings:', err);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

export default router;
