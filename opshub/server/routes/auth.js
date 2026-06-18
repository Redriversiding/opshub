const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { auth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const result = await query(
      'SELECT * FROM users WHERE username = $1 AND active = true',
      [username.toLowerCase().trim()]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid username or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — get current user
router.get('/me', auth, async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json(safeUser);
});

// PUT /api/auth/password — change own password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/push-subscribe — save push subscription
router.post('/push-subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    await query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET subscription = $2`,
      [req.user.id, subscription]
    );
    res.json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
