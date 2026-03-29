/**
 * Client Management Routes
 * GET    /api/clients       - List clients (paginated, searchable)
 * GET    /api/clients/:id   - Get single client
 * POST   /api/clients       - Create client
 * PUT    /api/clients/:id   - Update client
 * DELETE /api/clients/:id   - Delete client (admin only)
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/clients?page=1&limit=20&search=name&type=supplier
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { search, type } = req.query;

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }

    if (type && ['supplier', 'receiver'].includes(type)) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clients ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM clients ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      clients: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/clients/all — Get all clients (for dropdowns)
 */
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, phone FROM clients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get all clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/clients/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/clients
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().trim(),
    body('type').isIn(['supplier', 'receiver']).withMessage('Type must be supplier or receiver'),
    body('balance').optional().isNumeric().withMessage('Balance must be a number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, phone, type, balance } = req.body;
      const result = await pool.query(
        `INSERT INTO clients (name, phone, type, balance) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [name, phone || null, type, balance || 0]
      );

      await logActivity(req.user.id, 'CREATE', 'client', result.rows[0].id, { name, type });
      res.status(201).json({ message: 'Client created', client: result.rows[0] });
    } catch (err) {
      console.error('Create client error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * PUT /api/clients/:id
 */
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().trim(),
    body('type').optional().isIn(['supplier', 'receiver']).withMessage('Invalid type'),
    body('balance').optional().isNumeric().withMessage('Balance must be a number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, phone, type, balance } = req.body;
      const fields = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
      if (type !== undefined) { fields.push(`type = $${idx++}`); values.push(type); }
      if (balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(balance); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(req.params.id);

      const result = await pool.query(
        `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await logActivity(req.user.id, 'UPDATE', 'client', req.params.id, { name, type });
      res.json({ message: 'Client updated', client: result.rows[0] });
    } catch (err) {
      console.error('Update client error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * DELETE /api/clients/:id (Admin only)
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await logActivity(req.user.id, 'DELETE', 'client', req.params.id, result.rows[0]);
    res.json({ message: 'Client deleted', client: result.rows[0] });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
