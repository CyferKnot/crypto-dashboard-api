// routes/dev.js
import express from 'express';
import { clearAllAlertFlags, deleteAllHoldings } from '../db/db.js';

const router = express.Router();

router.post('/reset-alerts', async (req, res) => {
  try {
    await clearAllAlertFlags();
    res.json({ status: 'ok', message: 'All alert_sent flags reset.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/clear-holdings', async (req, res) => {
  try {
    await deleteAllHoldings();
    res.json({ status: 'ok', message: 'All holdings cleared.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
