const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const name = 'Lakshay';
  const email = 'pmnhlpr@gmail.com';
  const password = 'lakshay123';
  const role = 'admin';

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password = $3, role = $4
       RETURNING id, name, email, role`,
      [name, email, hash, role]
    );
    console.log('✅ Admin user created/updated:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();
