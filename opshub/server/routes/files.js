const router = require('express').Router();
const multer = require('multer');
const { query } = require('../db');
const { auth, requireAdmin } = require('../middleware/auth');
const { uploadFile, getFileUrl, deleteFile } = require('../utils/storage');

// Store in memory, max 50MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and image files allowed'));
  }
});

// POST /api/files/blueprint/:jobId — upload blueprint or colour selection
router.post('/blueprint/:jobId', auth, upload.single('file'), async (req, res) => {
  try {
    if (!['owner','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { category, label } = req.body; // category: 'blueprint' | 'colour' | 'document'
    const { key, name } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `jobs/${req.params.jobId}/blueprints`
    );

    const result = await query(
      `INSERT INTO blueprints (job_id, name, category, label, file_key, file_size)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.jobId, name, category || 'blueprint',
       label || name, key, req.file.size]
    );

    res.status(201).json({
      ...result.rows[0],
      file_url: await getFileUrl(key)
    });
  } catch (err) {
    console.error('Blueprint upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/files/po/:jobId — upload purchase order
router.post('/po/:jobId', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { distributor, amount } = req.body;
    const { key, name } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `jobs/${req.params.jobId}/pos`
    );

    const result = await query(
      `INSERT INTO purchase_orders (job_id, name, distributor, amount, file_key)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.jobId, name, distributor || 'Unknown', amount || '—', key]
    );

    res.status(201).json({
      ...result.rows[0],
      file_url: await getFileUrl(key)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// GET /api/files/view/:type/:id — get fresh signed URL for viewing
router.get('/view/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    let result;

    if (type === 'blueprint') {
      result = await query('SELECT * FROM blueprints WHERE id = $1', [id]);
    } else if (type === 'po') {
      if (!['owner','admin','driver'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
      result = await query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (!result.rows.length) return res.status(404).json({ error: 'File not found' });
    const file = result.rows[0];
    if (!file.file_key) return res.status(404).json({ error: 'No file stored' });

    const url = await getFileUrl(file.file_key);
    res.json({ url, name: file.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/files/blueprint/:id
router.delete('/blueprint/:id', auth, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM blueprints WHERE id = $1', [req.params.id]);
    if (result.rows.length && result.rows[0].file_key) {
      await deleteFile(result.rows[0].file_key);
    }
    await query('DELETE FROM blueprints WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/files/po/:id
router.delete('/po/:id', auth, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
    if (result.rows.length && result.rows[0].file_key) {
      await deleteFile(result.rows[0].file_key);
    }
    await query('DELETE FROM purchase_orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
