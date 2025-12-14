const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');
const { generateToken } = require('../src/utils/jwt');

// Use test database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Ingredient Requests API', () => {
  let userToken;
  let regularUser;
  const createdRequestIds = new Set();

  beforeAll(async () => {
    const userResult = await pool.query("SELECT * FROM users WHERE role = 'user' LIMIT 1");
    regularUser = userResult.rows[0];
    userToken = generateToken(regularUser);
  });

  afterAll(async () => {
    if (createdRequestIds.size > 0) {
      await pool.query('DELETE FROM ingredient_requests WHERE id = ANY($1::int[])', [Array.from(createdRequestIds)]);
    }
    await pool.end();
  });

  test('POST /api/ingredients/requests should require auth', async () => {
    await request(app)
      .post('/api/ingredients/requests')
      .send({ name: 'some-new-ingredient' })
      .expect(401);
  });

  test('POST /api/ingredients/requests should return exists for existing ingredient', async () => {
    const response = await request(app)
      .post('/api/ingredients/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'garlic' })
      .expect(200);

    expect(response.body.status).toBe('exists');
    expect(response.body).toHaveProperty('ingredient');
    expect(String(response.body.ingredient.name).toLowerCase()).toBe('garlic');
  });

  test('POST /api/ingredients/requests should create a pending request for a new ingredient', async () => {
    const unique = `test-ingredient-${Date.now()}`;

    const response = await request(app)
      .post('/api/ingredients/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: unique })
      .expect(201);

    expect(response.body.status).toBe('pending');
    expect(response.body).toHaveProperty('request');
    expect(String(response.body.request.requested_name)).toBe(unique);

    createdRequestIds.add(response.body.request.id);

    const db = await pool.query('SELECT * FROM ingredient_requests WHERE id = $1', [response.body.request.id]);
    expect(db.rows.length).toBe(1);
    expect(db.rows[0].status).toBe('pending');
  });

  test('POST /api/ingredients/requests should be idempotent for pending requests', async () => {
    const unique = `test-ingredient-pending-${Date.now()}`;

    const first = await request(app)
      .post('/api/ingredients/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: unique })
      .expect(201);

    createdRequestIds.add(first.body.request.id);

    const second = await request(app)
      .post('/api/ingredients/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: unique })
      .expect(200);

    expect(second.body.status).toBe('pending');
    expect(second.body.request.id).toBe(first.body.request.id);
  });

  test('POST /api/ingredients/requests should allow resubmitting a rejected request', async () => {
    const unique = `test-ingredient-rejected-${Date.now()}`;
    const normalized = unique.trim().toLowerCase();

    const seeded = await pool.query(
      `INSERT INTO ingredient_requests (requested_name, normalized_name, requested_by, status, reviewed_by, admin_notes, reviewed_at)
       VALUES ($1, $2, $3, 'rejected', $3, 'no', CURRENT_TIMESTAMP)
       RETURNING *`,
      [unique, normalized, regularUser.id]
    );

    createdRequestIds.add(seeded.rows[0].id);

    const response = await request(app)
      .post('/api/ingredients/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: unique })
      .expect(200);

    expect(response.body.status).toBe('pending');
    expect(response.body.request.id).toBe(seeded.rows[0].id);

    const db = await pool.query('SELECT * FROM ingredient_requests WHERE id = $1', [seeded.rows[0].id]);
    expect(db.rows[0].status).toBe('pending');
    expect(db.rows[0].reviewed_by).toBeNull();
    expect(db.rows[0].reviewed_at).toBeNull();
  });
});
