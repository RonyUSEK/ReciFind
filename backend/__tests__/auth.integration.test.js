const request = require('supertest');
const { Pool } = require('pg');

let app;
let pool;

beforeAll(() => {
  // Set test environment variables to use real database
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://recifind:recifind123@localhost:5432/recifind';
  
  // Create real pool connection
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Import app after env vars are set
  app = require('../index');
  app.locals.pool = pool;
});

afterAll(async () => {
  await pool.end();
});

describe('Authentication Integration Tests (Real Database)', () => {
  
  describe('POST /api/auth/register - Integration', () => {
    
    it('should register a new user with real database', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Integration Test User'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(uniqueEmail);
      expect(response.body.user.name).toBe('Integration Test User');
      expect(response.body.user.role).toBe('user');
      expect(response.body.user).not.toHaveProperty('password_hash');
      
      // Verify user was actually created in database
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [uniqueEmail]
      );
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe(uniqueEmail);
      expect(result.rows[0].password_hash).toBeDefined();
      expect(result.rows[0].password_hash).not.toBe('password123'); // Should be hashed
      
      // Cleanup - delete test user
      await pool.query('DELETE FROM users WHERE email = $1', [uniqueEmail]);
    });
    
    it('should reject registration with existing email (real database)', async () => {
      // Use a seed user email that definitely exists
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@recifind.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
    
    it('should verify password_hash column exists and is used correctly', async () => {
      // This test specifically checks for the error we encountered
      const uniqueEmail = `password-hash-test-${Date.now()}@example.com`;
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'testpassword123',
          name: 'Password Hash Test'
        });
      
      // Should succeed if password_hash column exists
      expect(response.status).toBe(201);
      
      // Query database directly to verify password_hash column
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [uniqueEmail]
      );
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].password_hash).toBeDefined();
      expect(result.rows[0].password_hash.length).toBeGreaterThan(20); // Hashed passwords are long
      
      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [uniqueEmail]);
    });
  });
  
  describe('POST /api/auth/login - Integration', () => {
    
    it('should login with real database credentials', async () => {
      // Use seed data credentials (from seed.sql)
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('john.doe@example.com');
    });
  });
  
  describe('Database Schema Verification', () => {
    
    it('should verify users table has password_hash column', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
      `);
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].column_name).toBe('password_hash');
    });
    
    it('should verify users table structure matches schema', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map(r => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('password_hash');
      expect(columns).toContain('name');
      expect(columns).toContain('role');
      expect(columns).toContain('is_verified');
      expect(columns).toContain('reputation_score');
      expect(columns).toContain('bio');
      expect(columns).toContain('profile_image');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });
});
