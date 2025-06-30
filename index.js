// index.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import priceRouter from './routes/price.js';
import alertRouter from './routes/alert.js';
import historyRouter from './routes/history.js';

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/price', priceRouter);
app.use('/api/alert', alertRouter);
app.use('/api/history', historyRouter);
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
