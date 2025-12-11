const request = require('supertest');
const app = require('../index');

describe('Reports API', () => {
  let userToken;
  let adminToken;
  let testRecipeId;

  beforeAll(async () => {
    // Login as user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'password123'
      });
    userToken = userLogin.body.token;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@recifind.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;

    // Use a test recipe ID (assuming demo data exists)
    testRecipeId = 1;
  });

  test('User can submit a recipe report', async () => {
    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content_type: 'recipe',
        content_id: testRecipeId,
        reason: 'spam',
        description: 'This recipe looks like spam'
      });

    // Accept either 201 (new report) or 400 (already reported)
    expect([201, 400]).toContain(response.status);
    
    if (response.status === 201) {
      expect(response.body.message).toContain('submitted');
      expect(response.body.report).toHaveProperty('id');
      expect(response.body.report.status).toBe('pending');
    } else {
      expect(response.body.error).toContain('already reported');
    }
  });

  test('User cannot submit duplicate report', async () => {
    // Try to submit same report again
    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content_type: 'recipe',
        content_id: testRecipeId,
        reason: 'spam',
        description: 'Duplicate report'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already reported');
  });

  test('Report requires authentication', async () => {
    const response = await request(app)
      .post('/api/reports')
      .send({
        content_type: 'recipe',
        content_id: testRecipeId,
        reason: 'spam'
      });

    expect(response.status).toBe(401);
  });

  test('User can view their own reports', async () => {
    const response = await request(app)
      .get('/api/reports/my')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reports');
    expect(Array.isArray(response.body.reports)).toBe(true);
  });

  test('Admin can view all reports', async () => {
    const response = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reports');
    expect(Array.isArray(response.body.reports)).toBe(true);
  });

  test('Admin can filter reports by status', async () => {
    const response = await request(app)
      .get('/api/admin/reports?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.reports.every(r => r.status === 'pending')).toBe(true);
  });

  test('Admin can get report statistics', async () => {
    const response = await request(app)
      .get('/api/admin/reports/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toHaveProperty('total');
    expect(response.body.stats).toHaveProperty('pending');
    expect(response.body.stats).toHaveProperty('resolved');
  });

  test('Non-admin cannot access admin report endpoints', async () => {
    const response = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});
