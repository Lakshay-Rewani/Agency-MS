require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  connectionTimeoutMillis: 10000
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection FAILED:', err.message);
    console.error('Error details:', err);
  } else {
    console.log('✅ Connection SUCCESS!');
    console.log('Database time:', res.rows[0].now);
  }
  pool.end();
});
