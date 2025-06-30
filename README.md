# Crypto Dashboard API

This project serves as a lightweight middleware to connect Google Sheets to CoinGecko's API and a Discord webhook for portfolio tracking, price monitoring, and alerting.

---

## 🚀 Features

- ✅ Price caching with in-memory TTL
- ✅ Rate limiting to avoid abuse
- ✅ REST API endpoints:
  - `/api/price?ids=bitcoin,ethereum` — Get live prices
  - `/api/history?id=bitcoin&days=7` — Get price history
  - `/api/alert` — Trigger a Discord alert
- ✅ Works with Google Apps Script for Sheets integration
- ✅ Discord Webhook alerts

---

## 📦 Setup

1. **Clone the repo**
   git clone https://github.com/yourname/crypto-dashboard-api.git
   cd crypto-dashboard-api

2. Install dependencies
   npm install

3. Create a .env file
   cp .env.example .env

4. Run the server
   node index.js

