import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

router.post('/wallets', async (req, res) => {
  const { address, label, chain } = req.body;
  try {
    const db = await getDB();
    await db.run(
      `INSERT OR IGNORE INTO wallets (address, label, chain) VALUES (?, ?, ?)`,
      [address, label, chain]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wallets', async (req, res) => {
  try {
    const db = await getDB();
    const wallets = await db.all(`SELECT * FROM wallets`);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
