const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');
const { generateToken } = require('../src/utils/jwt');

describe('Role changes apply immediately', () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
  });

  let user;
  let originalRole;
  let token;

  beforeAll(async () => {
    const res = await pool.query("SELECT * FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
    user = res.rows[0];
    expect(user).toBeTruthy();

    originalRole = user.role;
    token = generateToken(user); // token contains the old role ('user')
  });

  afterAll(async () => {
    if (user?.id && originalRole) {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [originalRole, user.id]);
    }
    await pool.end();
  });

  test('Old JWT still works right after promotion', async () => {
    // Promote in DB after token issuance
    await pool.query("UPDATE users SET role = 'chef' WHERE id = $1", [user.id]);

    // Endpoint is protected by requireRole(['chef','admin']).
    // With DB-backed role checks, this should succeed without re-login.
    await request(app)
      .get('/api/recipes/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
