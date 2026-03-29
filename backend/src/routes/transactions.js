/**
 * Transaction Management Routes
 * GET    /api/transactions       - List transactions (paginated, filterable)
 * GET    /api/transactions/:id   - Get single transaction
 * POST   /api/transactions       - Create transaction (auto-updates inventory)
 * PUT    /api/transactions/:id   - Update transaction (admin only)
 * DELETE /api/transactions/:id   - Delete transaction (admin only)
 * GET    /api/transactions/inventory/summary - Stock summary
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/transactions/inventory/summary
 * Returns auto-calculated stock based on IN/OUT transactions
 */
router.get('/inventory/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cloth_type,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) AS total_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS total_out,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
      FROM transactions
      GROUP BY cloth_type
      ORDER BY cloth_type
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Inventory summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/transactions?page=1&limit=20&client_id=xxx&type=IN&from=2024-01-01&to=2024-12-31
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { client_id, type, from, to, search } = req.query;

    const conditions = [];
    const params = [];

    if (client_id) {
      params.push(client_id);
      conditions.push(`t.client_id = $${params.length}`);
    }
    if (type && ['IN', 'OUT'].includes(type)) {
      params.push(type);
      conditions.push(`t.type = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`t.date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`t.date <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(t.cloth_type ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions t 
       JOIN clients c ON t.client_id = c.id 
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT t.*, c.name AS client_name, c.type AS client_type, u.name AS user_name
       FROM transactions t
       JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      transactions: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/transactions/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name AS client_name, u.name AS user_name
       FROM transactions t
       JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/transactions
 */
router.post(
  '/',
  [
    body('client_id').isUUID().withMessage('Valid client ID is required'),
    body('type').isIn(['IN', 'OUT']).withMessage('Type must be IN or OUT'),
    body('cloth_type').trim().notEmpty().withMessage('Cloth type is required'),
    body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
    body('rate').isFloat({ min: 0 }).withMessage('Rate must be 0 or more'),
    body('date').optional().isDate().withMessage('Valid date is required'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { client_id, type, cloth_type, quantity, rate, date, notes } = req.body;
      const total = parseFloat(quantity) * parseFloat(rate);

      const result = await pool.query(
        `INSERT INTO transactions (client_id, user_id, type, cloth_type, quantity, rate, total, date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [client_id, req.user.id, type, cloth_type, quantity, rate, total, date || new Date(), notes || null]
      );

      // Update client balance
      const balanceChange = type === 'IN' ? total : -total;
      await pool.query(
        'UPDATE clients SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [balanceChange, client_id]
      );

      await logActivity(req.user.id, 'CREATE', 'transaction', result.rows[0].id, {
        type, cloth_type, quantity, total
      });

      res.status(201).json({ message: 'Transaction created', transaction: result.rows[0] });
    } catch (err) {
      console.error('Create transaction error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * PUT /api/transactions/:id (Admin only)
 */
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { cloth_type, quantity, rate, type, date, notes } = req.body;
    
    // Get the old transaction to reverse balance
    const oldTx = await pool.query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    if (oldTx.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const old = oldTx.rows[0];

    const newQuantity = quantity || old.quantity;
    const newRate = rate || old.rate;
    const newTotal = parseFloat(newQuantity) * parseFloat(newRate);
    const newType = type || old.type;

    const result = await pool.query(
      `UPDATE transactions 
       SET cloth_type = COALESCE($1, cloth_type), quantity = $2, rate = $3, total = $4, 
           type = $5, date = COALESCE($6, date), notes = COALESCE($7, notes)
       WHERE id = $8 RETURNING *`,
      [cloth_type, newQuantity, newRate, newTotal, newType, date, notes, req.params.id]
    );

    // Reverse old balance and apply new
    const oldBalance = old.type === 'IN' ? -parseFloat(old.total) : parseFloat(old.total);
    const newBalance = newType === 'IN' ? newTotal : -newTotal;
    await pool.query(
      'UPDATE clients SET balance = balance + $1 + $2, updated_at = NOW() WHERE id = $3',
      [oldBalance, newBalance, old.client_id]
    );

    await logActivity(req.user.id, 'UPDATE', 'transaction', req.params.id);
    res.json({ message: 'Transaction updated', transaction: result.rows[0] });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/transactions/:id (Admin only)
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = old.rows[0];
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);

    // Reverse balance
    const balanceReverse = tx.type === 'IN' ? -parseFloat(tx.total) : parseFloat(tx.total);
    await pool.query(
      'UPDATE clients SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [balanceReverse, tx.client_id]
    );

    await logActivity(req.user.id, 'DELETE', 'transaction', req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
