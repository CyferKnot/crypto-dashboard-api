// services/discord.js
import fetch from 'node-fetch';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendAlert(message) {
  if (!DISCORD_WEBHOOK_URL) throw new Error('Webhook URL not configured');
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send alert: ${response.statusText}`);
  }
}
