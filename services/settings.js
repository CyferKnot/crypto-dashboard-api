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

// Returns a single setting by type and key
export async function getSettingByTypeAndKey(setting_type, setting_key, fallback = null) {
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

export async function getSettingsByType(setting_type) {
  const db = await getDB();
  const rows = await db.all(
    `SELECT setting_key AS key, setting_value AS value FROM settings WHERE setting_type = ? ORDER BY setting_value`,
    [setting_type]
  );
  return rows;
}


export async function addSetting(type, key, value) {
  const db = await getDB();
  return db.run(
    `INSERT INTO settings (setting_type, setting_key, setting_value) VALUES (?, ?, ?)`,
    [type, key, value]
  );
}

export async function deleteSetting(type, key) {
  const db = await getDB();
  return db.run(
    `DELETE FROM settings WHERE setting_type = ? AND setting_key = ?`,
    [type, key]
  );
}
