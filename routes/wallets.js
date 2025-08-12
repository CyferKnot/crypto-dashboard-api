//routes/wallets.js
import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const wallets = await db.all(`SELECT * FROM wallets`);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:address/:chain', async (req, res) => {
  console.log('DELETE /wallets hit')
  const db = await getDB();
  const { address, chain } = req.params;

  try {
    await db.run(
      `DELETE FROM wallets WHERE address = ? AND chain = ?`,
      [address.toLowerCase(), chain.toLowerCase()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting wallet:', err);
    res.status(500).json({ error: 'Failed to delete wallet' });
  }
});

export default router;
