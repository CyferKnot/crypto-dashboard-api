// routes/wallet.js
import express from 'express';
import { scanWallet } from '../services/wallet.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { address, chain = 'eth' } = req.query;
  if (!address) return res.status(400).json({ error: 'Missing address parameter' });

  try {
    const tokens = await scanWallet(address, chain);
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
