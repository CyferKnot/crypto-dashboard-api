// services/alerts.js
import { getDB } from '../db/db.js';
import { sendAlert } from './discord.js';
import { fetchTokenPrice } from './price.js'; // Assume we have this to fetch current token prices

export async function checkTargetsAndSendAlerts() {
  const db = await getDB();
  const targets = await db.all(`SELECT * FROM targets WHERE alert_sent = 0`);

  for (const target of targets) {
    const { token_symbol, profit_target, buy_target, coingecko_id } = target;
    const tokenId = coingecko_id || token_symbol.toLowerCase();

    try {
      const price = await fetchTokenPrice(tokenId); // E.g., get from CoinGecko
      let message = null;

      if (profit_target && price >= profit_target) {
        message = `🎯 ${token_symbol} has hit the profit target: $${price.toFixed(4)} (≥ $${profit_target})`;
      } else if (buy_target && price <= buy_target) {
        message = `💰 ${token_symbol} has dropped to the buy target: $${price.toFixed(4)} (≤ $${buy_target})`;
      }

      if (message) {
        await sendAlert(message);
        await db.run(
          `UPDATE targets SET alert_sent = 1 WHERE token_symbol = ?`,
          token_symbol
        );
      }
    } catch (err) {
      console.error(`Error checking ${token_symbol}:`, err.message);
    }
  }
}
