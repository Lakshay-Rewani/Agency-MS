/**
 * Payment Management Routes
 * GET    /api/payments       - List payments (paginated, filterable)
 * GET    /api/payments/:id   - Get single payment
 * POST   /api/payments       - Create payment
 * PUT    /api/payments/:id   - Update payment
 * DELETE /api/payments/:id   - Delete payment (admin only)
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/payments?page=1&limit=20&client_id=xxx&status=pending&from=2024-01-01&to=2024-12-31
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { client_id, status, from, to } = req.query;

    const conditions = [];
    const params = [];

    if (client_id) {
      params.push(client_id);
      conditions.push(`p.client_id = $${params.length}`);
    }
    if (status && ['paid', 'pending'].includes(status)) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`p.date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`p.date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM payments p
       JOIN clients c ON p.client_id = c.id
       ${whereClause}
       ORDER BY p.date DESC, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      payments: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/payments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM payments p JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/payments
 */
router.post(
  '/',
  [
    body('client_id').isUUID().withMessage('Valid client ID is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('status').isIn(['paid', 'pending']).withMessage('Status must be paid or pending'),
    body('date').optional().isDate().withMessage('Valid date is required'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { client_id, amount, status, date, notes } = req.body;

      const result = await pool.query(
        `INSERT INTO payments (client_id, amount, status, date, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [client_id, amount, status, date || new Date(), notes || null]
      );

      // If payment is marked as paid, reduce client balance
      if (status === 'paid') {
        await pool.query(
          'UPDATE clients SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [amount, client_id]
        );
      }

      await logActivity(req.user.id, 'CREATE', 'payment', result.rows[0].id, { amount, status });
      res.status(201).json({ message: 'Payment created', payment: result.rows[0] });
    } catch (err) {
      console.error('Create payment error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * PUT /api/payments/:id
 */
router.put(
  '/:id',
  [
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('status').optional().isIn(['paid', 'pending']).withMessage('Invalid status'),
    body('date').optional().isDate().withMessage('Valid date required'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get old payment
      const oldResult = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
      if (oldResult.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      const old = oldResult.rows[0];

      const { amount, status, date, notes } = req.body;
      const newAmount = amount || old.amount;
      const newStatus = status || old.status;

      const result = await pool.query(
        `UPDATE payments 
         SET amount = $1, status = $2, date = COALESCE($3, date), notes = COALESCE($4, notes)
         WHERE id = $5 RETURNING *`,
        [newAmount, newStatus, date, notes, req.params.id]
      );

      // Handle balance changes
      if (old.status === 'paid' && newStatus === 'pending') {
        // Was paid, now pending — add back the old amount
        await pool.query(
          'UPDATE clients SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [parseFloat(old.amount), old.client_id]
        );
      } else if (old.status === 'pending' && newStatus === 'paid') {
        // Was pending, now paid — subtract the new amount
        await pool.query(
          'UPDATE clients SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [parseFloat(newAmount), old.client_id]
        );
      } else if (old.status === 'paid' && newStatus === 'paid' && parseFloat(old.amount) !== parseFloat(newAmount)) {
        // Amount changed while paid
        const diff = parseFloat(newAmount) - parseFloat(old.amount);
        await pool.query(
          'UPDATE clients SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [diff, old.client_id]
        );
      }

      await logActivity(req.user.id, 'UPDATE', 'payment', req.params.id, { amount: newAmount, status: newStatus });
      res.json({ message: 'Payment updated', payment: result.rows[0] });
    } catch (err) {
      console.error('Update payment error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * DELETE /api/payments/:id (Admin only)
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = old.rows[0];
    await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);

    // If it was paid, reverse balance
    if (payment.status === 'paid') {
      await pool.query(
        'UPDATE clients SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [parseFloat(payment.amount), payment.client_id]
      );
    }

    await logActivity(req.user.id, 'DELETE', 'payment', req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
