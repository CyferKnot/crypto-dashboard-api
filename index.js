// index.js
console.log("Loaded webhook URL:", process.env.DISCORD_WEBHOOK_URL);

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import holdingsRouter from './routes/holdings.js';
import priceRouter from './routes/price.js';
import alertRouter from './routes/alerts.js';
import historyRouter from './routes/history.js';
import walletRouter from './routes/wallet.js';
import walletRoutes from './routes/wallets.js';
import devRouter from './routes/dev.js';
import targetsRouter from './routes/targets.js';
import syncRouter from './routes/sync.js';
import settingsRoutes from './routes/settings.js';
import chainsRoutes from './routes/chains.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1); 

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/holdings', holdingsRouter);
app.use('/api/price', priceRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/history', historyRouter);
app.use('/api/wallet-scan', walletRouter);
app.use('/api', walletRoutes);
app.use('/api/dev', devRouter);
app.use('/api/targets', targetsRouter);
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', syncRouter);
app.use('/api/settings', settingsRoutes);
app.use('/api/chains', chainsRoutes);

// app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

import { sendAlert } from './services/discord.js';

sendAlert('🚀 Crypto Dashboard backend has started.')
  .then(() => console.log('Startup alert sent to Discord'))
  .catch(err => console.error('Failed to send startup alert:', err.message));

import { checkTargetsAndSendAlerts } from './services/alerts.js';

setInterval(() => {
  checkTargetsAndSendAlerts().catch(err =>
    console.error('Error checking targets:', err.message)
  );
}, 5 * 60 * 1000); // Every 5 minutes
