// routes/chains.js
import express from 'express';
import { getSettingsByType, upsertSetting, deleteSetting } from '../services/settings.js';

const router = express.Router();

// GET /api/chains
router.get('/', async (_req, res) => {
  try {
    const chains = await getSettingsByType('chain');
    console.log('[chains] rows:', chains.length, chains);  // 👀
    res.json(chains);
  } catch (err) {
    console.error('Error fetching chains:', err);
    res.status(500).json({ error: 'Failed to fetch chains' });
  }
});

// POST /api/chains  { key, label }
router.post('/', async (req, res) => {
  try {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'Missing key or label' });
    await upsertSetting('chain', key, label);
    res.sendStatus(201);
  } catch (err) {
    console.error('Error adding chain:', err);
    res.status(500).json({ error: 'Failed to add chain' });
  }
});

// DELETE /api/chains/:key
router.delete('/:key', async (req, res) => {
  try {
    await deleteSetting('chain', req.params.key);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting chain:', err);
    res.status(500).json({ error: 'Failed to delete chain' });
  }
});

export default router;
