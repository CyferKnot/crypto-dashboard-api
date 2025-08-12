import { getDB } from '../db/db.js';

export async function resolveCoingeckoId(symbol, address) {
  const db = await getDB();

  const keyWithAddress = `${symbol.toUpperCase()}:${address.toLowerCase()}`;
  const keySymbolOnly = symbol.toUpperCase();

  // Try exact match with address
  const rowWithAddr = await db.get(
    `SELECT setting_value FROM settings WHERE setting_type = 'coingecko_map' AND setting_key = ?`,
    [keyWithAddress]
  );

  if (rowWithAddr) return rowWithAddr.setting_value;

  // Try just the symbol
  const rowSimple = await db.get(
    `SELECT setting_value FROM settings WHERE setting_type = 'coingecko_map' AND setting_key = ?`,
    [keySymbolOnly]
  );

  if (rowSimple) return rowSimple.setting_value;

  return null;
}
