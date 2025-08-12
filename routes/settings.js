// routes/settings.js
import express from 'express';
import {
  getSettingsByType,
  upsertSetting,
  deleteSetting
} from '../services/settings.js';

const router = express.Router();

/**
 * Back-compat: /api/settings/spam → ["claim","reward",...]
 */
router.get('/spam', async (_req, res) => {
  try {
    const list = await getSettingsByType('spam_filter');
    res.json(list.map(s => s.key));
  } catch (err) {
    console.error('Error loading spam filter list:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/settings/:type
 */
router.get('/:type', async (req, res) => {
  try {
    const rows = await getSettingsByType(req.params.type);
    res.json(rows);
  } catch (err) {
    console.error('Error loading settings:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * POST /api/settings/:type
 */
router.post('/:type', async (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key || typeof value === 'undefined') {
      return res.status(400).json({ error: 'Missing key or value' });
    }
    await upsertSetting(req.params.type, key, value);
    res.sendStatus(201);
  } catch (err) {
    console.error('Error upserting setting:', err);
    res.status(500).json({ error: 'Failed to upsert setting' });
  }
});

/**
 * DELETE /api/settings/:type/:key
 */
router.delete('/:type/:key', async (req, res) => {
  try {
    await deleteSetting(req.params.type, req.params.key);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting setting:', err);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
