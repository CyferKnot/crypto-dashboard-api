// services/status.js
import { getDB } from '../db/db.js';

export async function upsertStatusMetric(symbol, type, value) {
  const db = await getDB();
  await db.run(`
    INSERT INTO status_metrics (symbol, metric_type, metric_value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(symbol, metric_type) DO UPDATE SET
      metric_value = excluded.metric_value,
      updated_at = excluded.updated_at
  `, [symbol.toUpperCase(), type, value]);
}
