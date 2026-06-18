require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { checkReminders } = require('./utils/push');

const app = express();
const PORT = process.env.PORT || 3001;

// ── SECURITY ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API ROUTES ────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/jobs',      require('./routes/jobs'));
app.use('/api/files',     require('./routes/files'));
app.use('/api/reminders', require('./routes/reminders'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// VAPID public key for push notifications
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── SERVE REACT APP ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// ── REMINDER CHECK CRON ───────────────────────────────────────
// Run every hour
setInterval(async () => {
  try { await checkReminders(); }
  catch (err) { console.error('Reminder check error:', err); }
}, 60 * 60 * 1000);

// Run once on startup
checkReminders().catch(console.error);

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 OpsHub server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   API: http://localhost:${PORT}/api`);
  }
});

module.exports = app;
