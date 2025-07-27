// services/settings.js
import { getDB } from '../db/db.js';

export async function getSetting(key, fallback = null) {
  const db = await getDB();
  const row = await db.get(`SELECT value FROM settings WHERE key = ?`, [key]);
  if (!row) return fallback;

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}
