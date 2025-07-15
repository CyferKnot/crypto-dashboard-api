import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

// Return distinct token symbols from holdings (for the datalist)
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT token_symbol FROM holdings ORDER BY token_symbol ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
