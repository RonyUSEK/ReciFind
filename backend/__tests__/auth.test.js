const request = require('supertest');
const { Pool } = require('pg');

// We'll import the app once we create it
let app;
let pool;

// Mock database pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

beforeAll(() => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  
  pool = new Pool();
  
  // Import app after env vars are set
  app = require('../index');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

describe('Authentication API', () => {
  
  describe('POST /api/auth/register', () => {
    
    it('should register a new user successfully', async () => {
      // Mock: Check if email exists (should return no rows)
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock: Insert new user (should return the created user)
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: new Date()
        }]
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
    
    it('should reject registration with existing email', async () => {
      // Mock: Email already exists
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'existing@example.com' }]
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
    
    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
    
    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('POST /api/auth/login', () => {
    
    it('should login successfully with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Mock: Find user by email
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'user'
        }]
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    it('should reject login with wrong password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      
      // Mock: Find user
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'user'
        }]
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject login with non-existent email', async () => {
      // Mock: User not found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /api/auth/me', () => {
    
    it('should return current user with valid token', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 1, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Mock: Get user by ID
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          bio: 'Test bio'
        }]
      });
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return a new token and current user from DB', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 1, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Mock: Get user by ID (role may have changed in DB)
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'chef',
          bio: null,
          profile_image: null,
          reputation_score: 0,
          is_verified: false,
          created_at: new Date(),
        }],
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('chef');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
