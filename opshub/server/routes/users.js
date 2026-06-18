const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { auth, requireAdmin, requireOwner } = require('../middleware/auth');

const safeUser = u => {
  const { password_hash, ...safe } = u;
  return safe;
};

// GET /api/users — list all users (admin+)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users ORDER BY role, name');
    res.json(result.rows.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/crews — list crew users with trades (for dropdowns)
router.get('/crews', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, color, type, trades, rate, rate_unit, role
       FROM users WHERE role = 'crew' AND active = true ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/drivers
router.get('/drivers', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, color, truck FROM users WHERE role = 'driver' AND active = true ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/painters
router.get('/painters', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, color FROM users WHERE role = 'painter' AND active = true ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — create user (admin+)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, color, type, trades, rate, rateUnit, truck } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Username, password, and name required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Only owner can create owner/admin accounts
    if (['owner','admin'].includes(role) && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can create admin accounts' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (username, password_hash, name, role, color, type, trades, rate, rate_unit, truck)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [username.toLowerCase(), hash, name, role || 'crew', color || '#3A7BD5',
       type || 'inhouse', trades || [], rate || 0, rateUnit || 'hr', truck || null]
    );
    res.status(201).json(safeUser(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — update user
router.put('/:id', auth, async (req, res) => {
  try {
    // Users can update themselves; admins can update others
    const isSelf = req.user.id === req.params.id;
    if (!isSelf && !['owner','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, username, password, role, color, type, trades, rate, rateUnit, truck, active } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let i = 1;

    if (name) { updates.push(`name = $${i++}`); values.push(name); }
    if (username) { updates.push(`username = $${i++}`); values.push(username.toLowerCase()); }
    if (color) { updates.push(`color = $${i++}`); values.push(color); }
    if (type) { updates.push(`type = $${i++}`); values.push(type); }
    if (trades !== undefined) { updates.push(`trades = $${i++}`); values.push(trades); }
    if (rate !== undefined) { updates.push(`rate = $${i++}`); values.push(rate); }
    if (rateUnit) { updates.push(`rate_unit = $${i++}`); values.push(rateUnit); }
    if (truck !== undefined) { updates.push(`truck = $${i++}`); values.push(truck); }

    // Role and active — admin only, not self
    if (role && !isSelf && ['owner','admin'].includes(req.user.role)) {
      updates.push(`role = $${i++}`); values.push(role);
    }
    if (active !== undefined && !isSelf && ['owner','admin'].includes(req.user.role)) {
      updates.push(`active = $${i++}`); values.push(active);
    }

    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
      const hash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${i++}`); values.push(hash);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(safeUser(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — owner only
router.delete('/:id', auth, requireOwner, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
