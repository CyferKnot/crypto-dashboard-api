import { getDB } from '../db/db.js';
import { sendAlert } from './discord.js';
import { fetchPrices } from './price.js'; // ✅ use batch fetch

export async function checkTargetsAndSendAlerts() {
  const db = await getDB();
  const targets = await db.all(`SELECT * FROM targets WHERE alert_sent = 0`);

  // Step 1: Build ID map
  const idMap = {};
  for (const t of targets) {
    const id = t.coingecko_id || t.token_symbol?.toLowerCase();
    if (id) idMap[id] = t;
  }

  // Step 2: Fetch all prices at once
  const priceMap = await fetchPrices(Object.keys(idMap));

  // Step 3: Loop through targets and compare
  for (const [id, target] of Object.entries(idMap)) {
    const price = priceMap[id]?.usd;
    if (price == null) {
      console.warn(`⚠️ No price returned for ${id}`);
      continue;
    }

    let message = null;

    if (target.profit_target && price >= target.profit_target) {
      message = `🎯 ${target.token_symbol} has hit the profit target: $${price.toFixed(4)} (≥ $${target.profit_target})`;
    } else if (target.buy_target && price <= target.buy_target) {
      message = `💰 ${target.token_symbol} has dropped to the buy target: $${price.toFixed(4)} (≤ $${target.buy_target})`;
    }

    if (message) {
      await sendAlert(message);
      await db.run(
        `UPDATE targets SET alert_sent = 1 WHERE token_symbol = ?`,
        target.token_symbol
      );
    }
  }
}
