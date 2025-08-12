// services/settings.js
import { getDB } from '../db/db.js';

export async function getCoinGeckoMapObject() {
  const db = await getDB();
  const rows = await db.all(`
    SELECT setting_key, setting_value
    FROM settings
    WHERE setting_type = 'coingecko_map'
  `);

  const map = {};
  for (const r of rows) {
    // Normalize keys:
    // - SYMBOL only → uppercase
    // - SYMBOL:address → SYMBOL uppercase, address lowercase
    if (r.setting_key.includes(':')) {
      const [sym, addr] = r.setting_key.split(':');
      map[`${sym.toUpperCase()}:${addr.toLowerCase()}`] = r.setting_value;
    } else {
      map[r.setting_key.toUpperCase()] = r.setting_value;
    }
  }
  return map;
}

// Scoped get (typed)
export async function getSettingByTypeAndKey(setting_type, setting_key, fallback = null) {
  const db = await getDB();
  const row = await db.get(
    `SELECT setting_value FROM settings WHERE setting_type = ? AND setting_key = ?`,
    [setting_type, setting_key]
  );
  if (!row) return fallback;
  try { return JSON.parse(row.setting_value); } catch { return row.setting_value; }
}

// List by type, returns { key, value }
export async function getSettingsByType(setting_type) {
  const db = await getDB();
  // Log which DB file we’re actually connected to
  try {
    const dblist = await db.all('PRAGMA database_list;');
    console.log('[settings] DB list:', dblist);
  } catch {}

  const rows = await db.all(
    `SELECT setting_key AS key, setting_value AS value
     FROM settings
     WHERE setting_type = ?
     ORDER BY setting_value`,
    [setting_type]
  );
  console.log(`[settings] getSettingsByType(${setting_type}) ->`, rows.length);
  return rows;
}

// Upsert a single setting
export async function upsertSetting(setting_type, key, value) {
  const db = await getDB();
  return db.run(
    `INSERT OR REPLACE INTO settings (setting_type, setting_key, setting_value)
     VALUES (?, ?, ?)`,
    [setting_type, key, value]
  );
}

// Delete a single setting
export async function deleteSetting(setting_type, key) {
  const db = await getDB();
  return db.run(
    `DELETE FROM settings WHERE setting_type = ? AND setting_key = ?`,
    [setting_type, key]
  );
}
