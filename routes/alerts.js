// routes/alert.js
import express from 'express';
import { sendAlert } from '../services/discord.js';
const router = express.Router();

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    await sendAlert(message);
    res.status(200).json({ status: 'Alert sent' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
