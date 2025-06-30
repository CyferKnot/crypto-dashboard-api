import express from 'express';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Price API endpoint
app.get('/api/price', async (req, res) => {
  const idsParam = req.query.ids;
  if (!idsParam) {
    return res.status(400).json({ error: 'Missing ids parameter' });
  }

  const ids = idsParam.split(',').map(id => id.trim().toLowerCase());
  const now = Date.now();
  const results = {};
  const idsToFetch = [];

  // Check cache
  ids.forEach(id => {
    const cached = cache.get(id);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      results[id] = { usd: cached.value };
    } else {
      idsToFetch.push(id);
    }
  });

  // Fetch missing ids
  if (idsToFetch.length > 0) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(',')}&vs_currencies=usd`;
      const response = await fetch(url);
      const data = await response.json();

      idsToFetch.forEach(id => {
        if (data[id] && data[id].usd !== undefined) {
          cache.set(id, { value: data[id].usd, timestamp: now });
          results[id] = { usd: data[id].usd };
        }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
