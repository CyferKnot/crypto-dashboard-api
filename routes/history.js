// routes/history.js
import express from 'express';
import { getHistory } from '../services/coingecko.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { id, days } = req.query;
  if (!id || !days) {
    return res.status(400).json({ error: 'Missing id or days parameter' });
  }
  try {
    const history = await getHistory(id, days);
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
