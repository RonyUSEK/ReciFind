const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');

// Mock OpenAI configuration check
jest.mock('../src/services/openai', () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "AI Generated Chicken Pasta",
                description: "A delicious pasta dish with chicken and garlic",
                instructions: [
                  "Boil pasta according to package instructions",
                  "Cook chicken in a pan with garlic",
                  "Mix together and serve hot"
                ],
                ingredients: [
                  { name: "chicken", quantity: "500", unit: "g" },
                  { name: "pasta", quantity: "400", unit: "g" },
                  { name: "garlic", quantity: "3", unit: "cloves" }
                ],
                prep_time: 10,
                cook_time: 20,
                servings: 4,
                difficulty: "easy",
                cuisine: "Italian",
                spice_level: "mild",
                calories: 450
              })
            }
          }]
        })
      }
    }
  })),
  isConfigured: jest.fn(() => true), // Mock as configured
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('AI Recipe Generation API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create a test user and get auth token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User AI',
        email: `aitest${Date.now()}@example.com`,
        password: 'password123'
      });
    
    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
  });

  describe('POST /api/recipes/generate', () => {
    
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/recipes/generate')
        .send({ ingredients: ['chicken', 'garlic'] })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should generate recipe with valid ingredients', async () => {
      const response = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: ['chicken', 'garlic', 'pasta'],
          preferences: {
            diet: 'none',
            maxTime: 30
          }
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('recipe');
      expect(response.body.recipe).toHaveProperty('title');
      expect(response.body.recipe).toHaveProperty('description');
      expect(response.body.recipe).toHaveProperty('instructions');
      expect(response.body.recipe).toHaveProperty('ingredients');
      expect(Array.isArray(response.body.recipe.instructions)).toBe(true);
      expect(Array.isArray(response.body.recipe.ingredients)).toBe(true);
    });

    test('should reject empty ingredients array', async () => {
      const response = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: []
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing ingredients field', async () => {
      const response = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: { diet: 'vegan' }
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should handle dietary preferences in generation', async () => {
      const response = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: ['tofu', 'broccoli'],
          preferences: {
            diet: 'vegan',
            maxTime: 25
          }
        })
        .expect(200);
      
      expect(response.body.recipe).toBeDefined();
      expect(response.body.recipe.title).toBeDefined();
    });

    test('should enforce rate limiting (5 generations per day)', async () => {
      // Create a new user for this test to avoid conflicts
      const testEmail = `ratelimit${Date.now()}@example.com`;
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rate Limit Test',
          email: testEmail,
          password: 'password123'
        });
      
      const testToken = registerRes.body.token;
      const testUserId = registerRes.body.user.id;
      
      // Try to generate 6 recipes
      const generations = [];
      for (let i = 0; i < 6; i++) {
        generations.push(
          request(app)
            .post('/api/recipes/generate')
            .set('Authorization', `Bearer ${testToken}`)
            .set('x-test-rate-limit', 'true') // Enable rate limiting for this test
            .send({ ingredients: ['test', 'ingredient'] })
        );
      }
      
      const results = await Promise.all(generations);
      
      // At least one should be rate limited
      const rateLimited = results.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }, 10000);
  });
});
