/**
 * User Management Routes (Admin only)
 * GET    /api/users       - List all users (paginated)
 * GET    /api/users/:id   - Get single user
 * PUT    /api/users/:id   - Update user
 * DELETE /api/users/:id   - Delete user
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

// All routes require admin
router.use(authenticate, authorize('admin'));

/**
 * GET /api/users?page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, name, email, role, created_at, updated_at 
       FROM users ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      users: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/users/:id
 */
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, role, password } = req.body;
      const fields = [];
      const values = [];
      let idx = 1;

      if (name) { fields.push(`name = $${idx++}`); values.push(name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (role) { fields.push(`role = $${idx++}`); values.push(role); }
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        fields.push(`password = $${idx++}`);
        values.push(hashed);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(req.params.id);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} 
         RETURNING id, name, email, role, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await logActivity(req.user.id, 'UPDATE', 'user', req.params.id, { name, email, role });
      res.json({ message: 'User updated', user: result.rows[0] });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logActivity(req.user.id, 'DELETE', 'user', req.params.id, result.rows[0]);
    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
