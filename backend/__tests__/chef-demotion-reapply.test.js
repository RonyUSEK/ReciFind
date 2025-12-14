const request = require('supertest');
const { Pool } = require('pg');
const app = require('../index');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Chef demotion + reapply flow', () => {
  let createdUserEmail;
  let createdUserId;

  afterAll(async () => {
    try {
      if (createdUserEmail) {
        await pool.query('DELETE FROM users WHERE email = $1', [createdUserEmail]);
      }
    } finally {
      await pool.end();
    }
  });

  test('demoted chef does not keep approved application and can reapply', async () => {
    createdUserEmail = `demotion-${Date.now()}@example.com`;

    // 1) Register a new user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: createdUserEmail,
        password: 'password123',
        name: 'Demotion Test User',
      })
      .expect(201);

    createdUserId = registerRes.body.user.id;

    // 2) Submit chef application
    const applyRes = await request(app)
      .post('/api/auth/apply-chef')
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({
        full_name: 'Demotion Test User',
        bio: 'I love cooking',
        motivation: 'I want to share recipes',
      })
      .expect(201);

    const applicationId = applyRes.body.application.id;

    // 3) Admin login
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@recifind.com',
        password: 'password123',
      })
      .expect(200);

    const adminToken = adminLoginRes.body.token;

    // 4) Approve application
    await request(app)
      .post(`/api/admin/chef-applications/${applicationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 5) Demote user back to "user"
    await request(app)
      .put(`/api/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' })
      .expect(200);

    // Verify application row is cleared (so UI doesn't keep showing approved)
    const appRows = await pool.query('SELECT * FROM chef_applications WHERE user_id = $1', [createdUserId]);
    expect(appRows.rows.length).toBe(0);

    // 6) Login again as user and re-apply
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: createdUserEmail,
        password: 'password123',
      })
      .expect(200);

    expect(userLoginRes.body.user.role).toBe('user');

    await request(app)
      .post('/api/auth/apply-chef')
      .set('Authorization', `Bearer ${userLoginRes.body.token}`)
      .send({
        full_name: 'Demotion Test User',
        bio: 'I love cooking (again)',
        motivation: 'Reapplying after demotion',
      })
      .expect(201);
  });
});
