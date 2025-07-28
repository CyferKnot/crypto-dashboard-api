// services/settings.js
import { getDB } from '../db/db.js';

export async function getSetting(setting_key, fallback = null) {
  const db = await getDB();
  const row = await db.get(
    `SELECT setting_value FROM settings WHERE setting_key = ?`,
    [setting_key]
  );

  if (!row) return fallback;

  try {
    return JSON.parse(row.setting_value);
  } catch {
    return row.setting_value;
  }
}

export async function getSettingByType(setting_type, setting_key, fallback = null) {
  const db = await getDB();
  const row = await db.get(
    `SELECT setting_value FROM settings WHERE setting_type = ? AND setting_key = ?`,
    [setting_type, setting_key]
  );

  if (!row) return fallback;

  try {
    return JSON.parse(row.setting_value);
  } catch {
    return row.setting_value;
  }
}

export async function getChains() {
  const db = await getDB();
  const rows = await db.all(`SELECT setting_key AS id, setting_value AS name FROM settings WHERE setting_type = 'chain'`);
  return rows;
}
