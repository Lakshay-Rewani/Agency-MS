/**
 * Activity Logger Helper
 * Logs user actions to the activity_log table
 */
const pool = require('../config/db');

/**
 * Log an activity
 * @param {string} userId - The user who performed the action
 * @param {string} action - Action type (CREATE, UPDATE, DELETE)
 * @param {string} entityType - Entity type (client, transaction, payment, user)
 * @param {string} entityId - ID of the affected entity
 * @param {object} details - Additional details (optional)
 */
async function logActivity(userId, action, entityType, entityId, details = null) {
  try {
    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Don't let logging failures break the main flow
    console.error('Activity log error:', err.message);
  }
}

module.exports = { logActivity };
