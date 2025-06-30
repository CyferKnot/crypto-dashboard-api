// routes/price.js
import express from 'express';
import { getPrices } from '../services/coingecko.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const idsParam = req.query.ids;
  if (!idsParam) {
    return res.status(400).json({ error: 'Missing ids parameter' });
  }
  try {
    const data = await getPrices(idsParam);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
