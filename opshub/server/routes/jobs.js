const router = require('express').Router();
const { query } = require('../db');
const { auth, requireAdmin } = require('../middleware/auth');
const { getFileUrl } = require('../utils/storage');

// Visibility rules
const CAN_SEE_POS   = ['owner','admin','driver'];
const CAN_SEE_PAINT = ['owner','admin','painter','driver'];
const CAN_EDIT      = ['owner','admin'];
const CAN_EDIT_TASKS = ['owner','admin','crew'];

// Build full job object from DB rows
async function buildJob(jobRow, userRole, userId) {
  const jobId = jobRow.id;

  // Tasks
  const tasksResult = await query(
    `SELECT t.*, u.name as crew_name, u.color as crew_color
     FROM tasks t
     LEFT JOIN users u ON u.id = t.crew_id
     WHERE t.job_id = $1 ORDER BY t.sort_order, t.created_at`,
    [jobId]
  );

  // POs — role restricted
  let pos = [];
  if (CAN_SEE_POS.includes(userRole)) {
    const posResult = await query('SELECT * FROM purchase_orders WHERE job_id = $1 ORDER BY created_at', [jobId]);
    pos = await Promise.all(posResult.rows.map(async p => ({
      ...p,
      file_url: p.file_key ? await getFileUrl(p.file_key) : null
    })));
  }

  // Colours — role restricted
  let colours = [];
  if (CAN_SEE_PAINT.includes(userRole)) {
    const colResult = await query(
      `SELECT c.*, u.name as painter_name FROM colours c
       LEFT JOIN users u ON u.id = c.painter_id
       WHERE c.job_id = $1 ORDER BY c.created_at`,
      [jobId]
    );
    colours = colResult.rows;
    // Painter only sees their own colours
    if (userRole === 'painter') {
      colours = colours.filter(c => c.painter_id === userId || !c.painter_id);
    }
  }

  // Blueprints — everyone
  const bpResult = await query('SELECT * FROM blueprints WHERE job_id = $1 ORDER BY created_at', [jobId]);
  const blueprints = await Promise.all(bpResult.rows.map(async b => ({
    ...b,
    file_url: b.file_key ? await getFileUrl(b.file_key) : null
  })));

  return {
    ...jobRow,
    tasks: tasksResult.rows,
    pos,
    colours,
    blueprints,
  };
}

// GET /api/jobs
router.get('/', auth, async (req, res) => {
  try {
    let jobsQuery;
    const role = req.user.role;
    const userId = req.user.id;

    if (['owner','admin','viewer'].includes(role)) {
      // All jobs
      jobsQuery = await query(`
        SELECT j.*, u.name as driver_name
        FROM jobs j LEFT JOIN users u ON u.id = j.driver_id
        ORDER BY j.created_at DESC
      `);
    } else if (role === 'crew') {
      // Jobs where this crew has tasks OR tasks matching their trades exist unassigned
      jobsQuery = await query(`
        SELECT DISTINCT j.*, u.name as driver_name
        FROM jobs j
        LEFT JOIN users u ON u.id = j.driver_id
        JOIN tasks t ON t.job_id = j.id
        WHERE t.crew_id = $1
        ORDER BY j.created_at DESC
      `, [userId]);
    } else if (role === 'driver') {
      jobsQuery = await query(`
        SELECT j.*, u.name as driver_name
        FROM jobs j LEFT JOIN users u ON u.id = j.driver_id
        WHERE j.driver_id = $1
        ORDER BY j.created_at DESC
      `, [userId]);
    } else if (role === 'painter') {
      jobsQuery = await query(`
        SELECT DISTINCT j.*, u.name as driver_name
        FROM jobs j
        LEFT JOIN users u ON u.id = j.driver_id
        JOIN colours c ON c.job_id = j.id
        WHERE c.painter_id = $1 OR c.painter_id IS NULL
        ORDER BY j.created_at DESC
      `, [userId]);
    } else {
      return res.json([]);
    }

    // Build full job objects (light version — just task counts for list view)
    const jobs = await Promise.all(jobsQuery.rows.map(async j => {
      const tasksResult = await query(
        'SELECT id, name, crew_id, status, start_date, duration FROM tasks WHERE job_id = $1 ORDER BY sort_order',
        [j.id]
      );
      const posCount = CAN_SEE_POS.includes(role) ?
        (await query('SELECT COUNT(*) FROM purchase_orders WHERE job_id = $1', [j.id])).rows[0].count : 0;
      const colCount = CAN_SEE_PAINT.includes(role) ?
        (await query('SELECT COUNT(*) FROM colours WHERE job_id = $1', [j.id])).rows[0].count : 0;
      const bpCount = (await query('SELECT COUNT(*) FROM blueprints WHERE job_id = $1', [j.id])).rows[0].count;

      return {
        ...j,
        tasks: tasksResult.rows,
        pos_count: parseInt(posCount),
        colour_count: parseInt(colCount),
        blueprint_count: parseInt(bpCount),
      };
    }));

    res.json(jobs);
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/:id — full job detail
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = await buildJob(result.rows[0], req.user.role, req.user.id);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/jobs — create job
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { title, address, status, holdReason, scheduledDate, jobNumber, builder, plan, supplier } = req.body;
    if (!title || !address) return res.status(400).json({ error: 'Title and address required' });

    const result = await query(
      `INSERT INTO jobs (title, address, status, hold_reason, scheduled_date, job_number, builder, plan, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, address, status || 'scheduled', holdReason || '', scheduledDate || null,
       jobNumber || null, builder || null, plan || null, supplier || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/jobs/:id — update job
router.put('/:id', auth, async (req, res) => {
  try {
    const canEdit = CAN_EDIT.includes(req.user.role);
    const canEditTasks = CAN_EDIT_TASKS.includes(req.user.role);
    if (!canEdit && !canEditTasks) return res.status(403).json({ error: 'Insufficient permissions' });

    const { title, address, status, holdReason, scheduledDate, driverId,
            deliveryStatus, deliveryNotes, jobNumber, builder, plan, supplier } = req.body;

    if (canEdit) {
      await query(
        `UPDATE jobs SET title=$1, address=$2, status=$3, hold_reason=$4,
         scheduled_date=$5, driver_id=$6, delivery_status=$7, delivery_notes=$8,
         job_number=$9, builder=$10, plan=$11, supplier=$12, updated_at=NOW()
         WHERE id=$13`,
        [title, address, status, holdReason || '', scheduledDate || null,
         driverId || null, deliveryStatus || 'pending', deliveryNotes || '',
         jobNumber || null, builder || null, plan || null, supplier || null, req.params.id]
      );
    }

    // Update tasks if provided
    if (req.body.tasks && canEditTasks) {
      for (const task of req.body.tasks) {
        await query(
          `UPDATE tasks SET crew_id=$1, status=$2, start_date=$3, duration=$4, updated_at=NOW()
           WHERE id=$5 AND job_id=$6`,
          [task.crewId || null, task.status, task.startDate || null,
           task.duration || 1, task.id, req.params.id]
        );
      }
    }

    const result = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TASKS ─────────────────────────────────────────────────────

// POST /api/jobs/:id/tasks
router.post('/:id/tasks', auth, async (req, res) => {
  try {
    if (!CAN_EDIT_TASKS.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const { name, crewId, status, startDate, duration } = req.body;
    const result = await query(
      `INSERT INTO tasks (job_id, name, crew_id, status, start_date, duration)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, name, crewId || null, status || 'pending', startDate || null, duration || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/jobs/:jobId/tasks/:taskId
router.put('/:jobId/tasks/:taskId', auth, async (req, res) => {
  try {
    if (!CAN_EDIT_TASKS.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const { crewId, status, startDate, duration } = req.body;
    const result = await query(
      `UPDATE tasks SET crew_id=$1, status=$2, start_date=$3, duration=$4, updated_at=NOW()
       WHERE id=$5 AND job_id=$6 RETURNING *`,
      [crewId || null, status, startDate || null, duration || 1, req.params.taskId, req.params.jobId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/jobs/:jobId/tasks/:taskId
router.delete('/:jobId/tasks/:taskId', auth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id = $1 AND job_id = $2', [req.params.taskId, req.params.jobId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── COLOURS ───────────────────────────────────────────────────

// POST /api/jobs/:id/colours
router.post('/:id/colours', auth, requireAdmin, async (req, res) => {
  try {
    const { name, code, hex, painterId } = req.body;
    const result = await query(
      `INSERT INTO colours (job_id, name, code, hex, painter_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, name, code || '', hex || '#C4B49A', painterId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/jobs/:jobId/colours/:colourId
router.put('/:jobId/colours/:colourId', auth, async (req, res) => {
  try {
    if (!CAN_SEE_PAINT.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const { painterId, rack, status } = req.body;
    const result = await query(
      `UPDATE colours SET painter_id=$1, rack=$2, status=$3, updated_at=NOW()
       WHERE id=$4 AND job_id=$5 RETURNING *`,
      [painterId || null, rack || null, status || 'unassigned',
       req.params.colourId, req.params.jobId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELIVERY ──────────────────────────────────────────────────

// PUT /api/jobs/:id/delivery
router.put('/:id/delivery', auth, async (req, res) => {
  try {
    const { driverId, deliveryStatus, deliveryNotes } = req.body;
    const allowed = ['owner','admin','driver'].includes(req.user.role);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    await query(
      `UPDATE jobs SET driver_id=$1, delivery_status=$2, delivery_notes=$3, updated_at=NOW() WHERE id=$4`,
      [driverId || null, deliveryStatus || 'pending', deliveryNotes || '', req.params.id]
    );
    res.json({ message: 'Delivery updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
