// routes/chains.js
import express from 'express';
import {
  getSettingsByType,
  addSetting,
  deleteSetting
} from '../services/settings.js';

const router = express.Router();

// GET all chains
router.get('/', async (req, res) => {
  try {
    const chains = await getSettingsByType('chain');
    res.json(chains);
  } catch (err) {
    console.error('Error fetching chains:', err);
    res.status(500).json({ error: 'Failed to fetch chains' });
  }
});

// POST add chain
router.post('/', async (req, res) => {
  try {
    const { label, key } = req.body;
    await addSetting('chain', key, label);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error adding chain:', err);
    res.status(500).json({ error: 'Failed to add chain' });
  }
});

// DELETE chain
router.delete('/:key', async (req, res) => {
  try {
    await deleteSetting('chain', req.params.key);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting chain:', err);
    res.status(500).json({ error: 'Failed to delete chain' });
  }
});

export default router;
