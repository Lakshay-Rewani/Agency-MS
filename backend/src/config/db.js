/**
 * Database Configuration
 * Connects to PostgreSQL (Supabase) using connection pool
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Test connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('⚠️  Database connection failed:', err.message);
    console.log('   Make sure DATABASE_URL is set in .env file');
  } else {
    console.log('✅ Database connected successfully');
  }
});

module.exports = pool;
