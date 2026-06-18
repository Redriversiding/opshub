const jwt = require('jsonwebtoken');
const { query } = require('../db');

// Verify JWT and attach user to request
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT * FROM users WHERE id = $1 AND active = true', [decoded.id]);
    if (!result.rows.length) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireAdmin = requireRole('owner', 'admin');
const requireOwner = requireRole('owner');

module.exports = { auth, requireRole, requireAdmin, requireOwner };
