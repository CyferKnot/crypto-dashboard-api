import fs from 'fs';
import path from 'path';
import { getDB } from '../db/db.js';

async function importCoingeckoMap() {
  const db = await getDB();
  const filePath = path.resolve('./data/coingecko-map.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const map = JSON.parse(raw);

  const insert = await db.prepare(`
    INSERT OR REPLACE INTO settings (setting_type, setting_key, setting_value)
    VALUES ('coingecko_map', ?, ?)
  `);

  for (const [key, value] of Object.entries(map)) {
    await insert.run(key, value);
    console.log(`✅ Inserted: ${key} → ${value}`);
  }

  await insert.finalize();
  console.log('🎉 CoinGecko map import complete.');
}

importCoingeckoMap().catch(console.error);
