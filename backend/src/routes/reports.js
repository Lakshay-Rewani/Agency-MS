/**
 * Reports Routes
 * GET /api/reports/dashboard   - Dashboard summary statistics
 * GET /api/reports/daily       - Daily report
 * GET /api/reports/monthly     - Monthly report
 * GET /api/reports/client/:id  - Client-wise transaction history
 */
const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/reports/dashboard
 * Returns summary stats for the dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [clientsRes, transactionsRes, pendingPaymentsRes, stockRes, recentTxRes] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM clients'),
      pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS total_value FROM transactions'),
      pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total 
         FROM payments WHERE status = 'pending'`
      ),
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) AS total_in,
          COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS total_out,
          COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
        FROM transactions
      `),
      pool.query(`
        SELECT t.*, c.name AS client_name 
        FROM transactions t 
        JOIN clients c ON t.client_id = c.id 
        ORDER BY t.created_at DESC LIMIT 5
      `)
    ]);

    res.json({
      totalClients: parseInt(clientsRes.rows[0].total),
      totalTransactions: parseInt(transactionsRes.rows[0].total),
      totalTransactionValue: parseFloat(transactionsRes.rows[0].total_value),
      pendingPayments: {
        count: parseInt(pendingPaymentsRes.rows[0].count),
        total: parseFloat(pendingPaymentsRes.rows[0].total)
      },
      stock: {
        totalIn: parseFloat(stockRes.rows[0].total_in),
        totalOut: parseFloat(stockRes.rows[0].total_out),
        currentStock: parseFloat(stockRes.rows[0].current_stock)
      },
      recentTransactions: recentTxRes.rows
    });
  } catch (err) {
    console.error('Dashboard report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/reports/daily?date=2024-01-15
 */
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [transactions, payments] = await Promise.all([
      pool.query(
        `SELECT t.*, c.name AS client_name
         FROM transactions t JOIN clients c ON t.client_id = c.id
         WHERE t.date = $1 ORDER BY t.created_at DESC`,
        [date]
      ),
      pool.query(
        `SELECT p.*, c.name AS client_name
         FROM payments p JOIN clients c ON p.client_id = c.id
         WHERE p.date = $1 ORDER BY p.created_at DESC`,
        [date]
      )
    ]);

    const summary = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) AS qty_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS qty_out,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN total ELSE 0 END), 0) AS value_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN total ELSE 0 END), 0) AS value_out
      FROM transactions WHERE date = $1`,
      [date]
    );

    res.json({
      date,
      summary: summary.rows[0],
      transactions: transactions.rows,
      payments: payments.rows
    });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/reports/monthly?year=2024&month=1
 */
router.get('/monthly', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const result = await pool.query(
      `SELECT 
        date,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) AS qty_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS qty_out,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN total ELSE 0 END), 0) AS value_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN total ELSE 0 END), 0) AS value_out
      FROM transactions
      WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
      GROUP BY date ORDER BY date`,
      [year, month]
    );

    const paymentsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS total_pending,
        COUNT(*) AS payment_count
      FROM payments
      WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month]
    );

    res.json({
      year,
      month,
      dailyData: result.rows,
      paymentSummary: paymentsResult.rows[0]
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/reports/client/:id?from=2024-01-01&to=2024-12-31
 */
router.get('/client/:id', async (req, res) => {
  try {
    const { from, to } = req.query;
    const conditions = ['t.client_id = $1'];
    const params = [req.params.id];

    if (from) { params.push(from); conditions.push(`t.date >= $${params.length}`); }
    if (to) { params.push(to); conditions.push(`t.date <= $${params.length}`); }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const [clientRes, txRes, payRes] = await Promise.all([
      pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]),
      pool.query(
        `SELECT t.*, u.name AS user_name
         FROM transactions t LEFT JOIN users u ON t.user_id = u.id
         ${whereClause} ORDER BY t.date DESC`,
        params
      ),
      pool.query(
        `SELECT * FROM payments WHERE client_id = $1 ORDER BY date DESC`,
        [req.params.id]
      )
    ]);

    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      client: clientRes.rows[0],
      transactions: txRes.rows,
      payments: payRes.rows
    });
  } catch (err) {
    console.error('Client report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
