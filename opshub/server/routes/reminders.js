const router = require('express').Router();
const { query } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/reminders — user's reminders
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, j.title as job_title, t.name as task_name
       FROM reminders r
       LEFT JOIN jobs j ON j.id = r.job_id
       LEFT JOIN tasks t ON t.id = r.task_id
       WHERE r.user_id = $1
       ORDER BY r.trigger_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reminders
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, taskId, label, triggerDate, triggerType, daysBefore } = req.body;

    // Check if already exists (toggle off)
    const existing = await query(
      `SELECT id FROM reminders WHERE user_id=$1 AND task_id=$2 AND trigger_type=$3 AND days_before=$4`,
      [req.user.id, taskId, triggerType, daysBefore || 0]
    );
    if (existing.rows.length) {
      await query('DELETE FROM reminders WHERE id = $1', [existing.rows[0].id]);
      return res.json({ deleted: true, id: existing.rows[0].id });
    }

    const result = await query(
      `INSERT INTO reminders (user_id, job_id, task_id, label, trigger_date, trigger_type, days_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, jobId, taskId, label, triggerDate || null, triggerType, daysBefore || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/reminders/:id/dismiss
router.put('/:id/dismiss', auth, async (req, res) => {
  try {
    await query('UPDATE reminders SET dismissed = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Dismissed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
