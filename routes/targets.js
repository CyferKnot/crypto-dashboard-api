// routes/targets.js
import express from 'express';
import { getDB, getPriceTargets, getTriggeredTargets, logAlert, setAlertSent, getAlertsLog, setPriceTarget } from '../db/db.js';
import { getPrices } from '../services/coingecko.js';
import { sendAlert } from '../services/discord.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { token_symbol, buy_target, profit_target, buy_tax = 0, sell_tax = 0, coingecko_id } = req.body;
  try {
    console.log('target.js Coingecko ID:', coingecko_id)
    await setPriceTarget(token_symbol, buy_target, profit_target, buy_tax, sell_tax, coingecko_id);

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

// GET /api/targets/:token_symbol
router.get('/:token_symbol', async (req, res) => {
  const db = await getDB();
  const symbol = req.params.token_symbol.toUpperCase();

  try {
    const row = await db.get(`
      SELECT t.*, h.coingecko_id
      FROM targets t
      LEFT JOIN holdings h ON t.token_symbol = h.token_symbol
      WHERE t.token_symbol = ?
    `, symbol);

    if (!row) {
      return res.status(404).json({ message: 'No target set for this token yet.' });
    }

    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/update', async (req, res) => {
  const { token_symbol, ...updates } = req.body;
  if (!token_symbol || !Object.keys(updates).length) {
    return res.status(400).json({ error: 'Missing token_symbol or updates' });
  }

  const db = await getDB();
  const fields = Object.keys(updates);
  const values = fields.map(f => updates[f]);
  const setClause = fields.map(f => `${f} = ?`).join(', ');

  try {
    await db.run(
      `UPDATE targets SET ${setClause} WHERE token_symbol = ?`,
      [...values, token_symbol]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update target' });
  }
});

export default router;
