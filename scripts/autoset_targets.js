// scripts/autoset_targets.js
import { getAllHoldings, getPriceTargetForToken, setPriceTarget } from '../db/db.js';

function generateBullMarketTargets(price) {
  const buyTarget = price * (0.65 + Math.random() * 0.10);       // 65–75%
  const profitTarget = price * (1.80 + Math.random() * 0.70);    // 180–250%
  return {
    buy_target: parseFloat(buyTarget.toFixed(4)),
    profit_target: parseFloat(profitTarget.toFixed(4)),
  };
}

export async function autoSetMissingTargets() {
  const holdings = await getAllHoldings();

  for (const holding of holdings) {
    const { token_symbol, usd_price } = holding;
    if (!token_symbol || !usd_price || usd_price === 0) continue;

    const existing = await getPriceTargetForToken(token_symbol);
    if (existing) continue;

    const { buy_target, profit_target } = generateBullMarketTargets(usd_price);
    await setPriceTarget(token_symbol, buy_target, profit_target);
    console.log(`✅ Auto-set targets for ${token_symbol}: Buy @ $${buy_target}, Profit @ $${profit_target}`);
  }
}
