import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import occasionRoutes from './routes/occasions.js';
import messageRoutes from './routes/messages.js';
import billingRoutes from './routes/billing.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Raw body needed for Stripe webhooks — must be before express.json()
app.use('/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());

// Global rate limit: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/auth', authRoutes);
app.use('/contacts', contactRoutes);
app.use('/occasions', occasionRoutes);
app.use('/messages', messageRoutes);
app.use('/billing', billingRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`love.app backend running on port ${PORT}`);
});

export default app;
