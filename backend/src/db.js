// Database connection utilities
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

module.exports = { pool };
