require('dotenv').config();
const { query } = require('./index');

async function migrate() {
  console.log('Running migrations...');

  // USERS
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'crew',
      color VARCHAR(7) DEFAULT '#3A7BD5',
      type VARCHAR(20) DEFAULT 'inhouse',
      trades TEXT[] DEFAULT '{}',
      rate DECIMAL(10,2) DEFAULT 0,
      rate_unit VARCHAR(20) DEFAULT 'hr',
      truck VARCHAR(50),
      active BOOLEAN DEFAULT true,
      push_subscription JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // JOBS
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      status VARCHAR(30) DEFAULT 'scheduled',
      hold_reason TEXT DEFAULT '',
      scheduled_date DATE,
      driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
      delivery_status VARCHAR(30) DEFAULT 'pending',
      delivery_notes TEXT DEFAULT '',
      job_number VARCHAR(50),
      builder VARCHAR(100),
      plan VARCHAR(100),
      supplier VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // TASKS
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      crew_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'pending',
      start_date DATE,
      duration INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // PURCHASE ORDERS
  await query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      distributor VARCHAR(100),
      amount VARCHAR(50),
      file_key VARCHAR(500),
      file_url VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // COLOURS
  await query(`
    CREATE TABLE IF NOT EXISTS colours (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50),
      hex VARCHAR(7) DEFAULT '#C4B49A',
      painter_id UUID REFERENCES users(id) ON DELETE SET NULL,
      rack VARCHAR(50),
      status VARCHAR(20) DEFAULT 'unassigned',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // BLUEPRINTS / DOCUMENTS
  await query(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(30) DEFAULT 'blueprint',
      label VARCHAR(100),
      file_key VARCHAR(500),
      file_url VARCHAR(500),
      file_size INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // REMINDERS
  await query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      label VARCHAR(255),
      trigger_date DATE,
      trigger_type VARCHAR(20),
      days_before INTEGER DEFAULT 0,
      fired BOOLEAN DEFAULT false,
      dismissed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // PUSH SUBSCRIPTIONS
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `);

  // Indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks(job_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_crew_id ON tasks(crew_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_colours_job_id ON colours(job_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_blueprints_job_id ON blueprints(job_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reminders_trigger_date ON reminders(trigger_date);`);

  // Default owner account (change password after first login!)
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('owner123', 12);
  await query(`
    INSERT INTO users (username, password_hash, name, role, color, type, active)
    VALUES ('owner', $1, 'Owner', 'owner', '#E8A020', 'inhouse', true)
    ON CONFLICT (username) DO NOTHING;
  `, [hash]);

  console.log('✅ Migrations complete. Default owner account: owner / owner123');
  console.log('⚠️  Change the owner password immediately after first login!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
