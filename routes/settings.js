// routes/settings.js
import express from 'express';
import { getDB } from '../db/db.js';

const router = express.Router();

// Utility: Get settings by type
async function getSettingsByType(type) {
  const db = await getDB();
  return db.all(`SELECT key, value FROM settings WHERE type = ?`, [type]);
}

// GET all chains
router.get('/chains', async (req, res) => {
  try {
    const chains = await getSettingsByType('chain');
    res.json(chains); // [{ key: 'eth', value: 'Ethereum' }, ...]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new or updated chain
router.post('/chains', async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Missing key or value' });

  try {
    const db = await getDB();
    await db.run(`INSERT OR REPLACE INTO settings (type, key, value) VALUES ('chain', ?, ?)`, [key, value]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE chain by key
router.delete('/chains/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const db = await getDB();
    await db.run(`DELETE FROM settings WHERE type = 'chain' AND key = ?`, [key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
