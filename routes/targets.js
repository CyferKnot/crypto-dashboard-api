// routes/targets.js
import express from 'express';
import { getPriceTargets, getTriggeredTargets, logAlert, setAlertSent, getAlertsLog, setPriceTarget } from '../db/db.js';
import { getPrices } from '../services/coingecko.js';
import { sendAlert } from '../services/discord.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { token_symbol, buy_target, profit_target } = req.body;
  try {
    await setPriceTarget(token_symbol, buy_target, profit_target);
    res.json({ status: 'ok', message: 'Price target set/updated.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const targets = await getPriceTargets();
    res.json(targets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/alerts-log', async (req, res) => {
  try {
    const log = await getAlertsLog();
    res.json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/check-alerts', async (req, res) => {
  try {
    const targets = await getPriceTargets();
    const ids = targets.map(t => t.token_symbol.toLowerCase()).join(',');
    const prices = await getPrices(ids);

    const triggered = await getTriggeredTargets(prices);
    for (const target of triggered) {
      const price = prices[target.token_symbol.toLowerCase()].usd;
      const direction = price <= target.buy_target ? 'buy' : 'sell';
      const action = direction === 'buy' ? 'Consider Buying' : 'Take Profit';

      const msg = `🔔 **${target.token_symbol}** hit ${direction.toUpperCase()} target at $${price.toFixed(2)}\nAction: **${action}**`;

      await sendAlert(msg);
      await logAlert(target.token_symbol, price, direction, action);
      await setAlertSent(target.token_symbol, true);
    }

    res.json({ status: 'ok', triggered });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
