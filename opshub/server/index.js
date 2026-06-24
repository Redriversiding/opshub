require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { checkReminders } = require('./utils/push');
const { pool } = require('./db');

// Auto-migrate on startup
async function autoMigrate() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'crew', color VARCHAR(7) DEFAULT '#3A7BD5', type VARCHAR(20) DEFAULT 'inhouse', trades TEXT[] DEFAULT '{}', rate DECIMAL(10,2) DEFAULT 0, rate_unit VARCHAR(20) DEFAULT 'hr', truck VARCHAR(50), active BOOLEAN DEFAULT true, push_subscription JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(255) NOT NULL, address VARCHAR(255) NOT NULL, status VARCHAR(30) DEFAULT 'scheduled', hold_reason TEXT DEFAULT '', scheduled_date DATE, driver_id UUID REFERENCES users(id) ON DELETE SET NULL, delivery_status VARCHAR(30) DEFAULT 'pending', delivery_notes TEXT DEFAULT '', job_number VARCHAR(50), builder VARCHAR(100), plan VARCHAR(100), supplier VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, name VARCHAR(50) NOT NULL, crew_id UUID REFERENCES users(id) ON DELETE SET NULL, status VARCHAR(20) DEFAULT 'pending', start_date DATE, duration INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, notes TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, distributor VARCHAR(100), amount VARCHAR(50), file_key VARCHAR(500), file_url VARCHAR(500), created_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS colours (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, code VARCHAR(50), hex VARCHAR(7) DEFAULT '#C4B49A', painter_id UUID REFERENCES users(id) ON DELETE SET NULL, rack VARCHAR(50), status VARCHAR(20) DEFAULT 'unassigned', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS blueprints (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, category VARCHAR(30) DEFAULT 'blueprint', label VARCHAR(100), file_key VARCHAR(500), file_url VARCHAR(500), file_size INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reminders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, job_id UUID REFERENCES jobs(id) ON DELETE CASCADE, task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, label VARCHAR(255), trigger_date DATE, trigger_type VARCHAR(20), days_before INTEGER DEFAULT 0, fired BOOLEAN DEFAULT false, dismissed BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id));`);
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('owner123', 12);
    await pool.query(`INSERT INTO users (username, password_hash, name, role, color, type, active) VALUES ('owner', $1, 'Owner', 'owner', '#E8A020', 'inhouse', true) ON CONFLICT (username) DO NOTHING;`, [hash]);
    console.log('✅ Database ready');
  } catch(err) {
    console.error('Migration error:', err.message);
  }
}
autoMigrate();
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
