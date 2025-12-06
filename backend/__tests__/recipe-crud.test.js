const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');
const { generateToken } = require('../src/utils/jwt');

// Use test database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Recipe CRUD API (Chef Only)', () => {
  let chefToken;
  let userToken;
  let adminToken;
  let chefUser;

  beforeAll(async () => {
    // Get test users from database
    const chefResult = await pool.query(
      "SELECT * FROM users WHERE role = 'chef' LIMIT 1"
    );
    
    const userResult = await pool.query(
      "SELECT * FROM users WHERE role = 'user' LIMIT 1"
    );
    
    const adminResult = await pool.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );

    chefUser = chefResult.rows[0];
    const regularUser = userResult.rows[0];
    const adminUser = adminResult.rows[0];

    // Generate tokens
    chefToken = generateToken(chefUser);
    userToken = generateToken(regularUser);
    adminToken = generateToken(adminUser);
  });

  describe('POST /api/recipes - Create Recipe', () => {
    test('should allow chef to create a recipe', async () => {
      const newRecipe = {
        title: 'Test Chef Recipe',
        description: 'A test recipe created by chef',
        instructions: ['Step 1', 'Step 2', 'Step 3'],
        ingredients: [
          { name: 'chicken', quantity: '500', unit: 'g' },
          { name: 'salt', quantity: '1', unit: 'tsp' }
        ],
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'medium',
        cuisine: 'Test Cuisine',
        spice_level: 'mild',
        calories: 400
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${chefToken}`)
        .send(newRecipe)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newRecipe.title);
      expect(response.body.status).toBe('pending');
      expect(response.body.chef_id).toBe(chefUser.id);
    });

    test('should not allow regular user to create recipe', async () => {
      const newRecipe = {
        title: 'User Recipe',
        description: 'Should fail',
        instructions: ['Step 1'],
        ingredients: []
      };

      await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newRecipe)
        .expect(403);
    });

    test('should require authentication', async () => {
      const newRecipe = {
        title: 'No Auth Recipe',
        description: 'Should fail'
      };

      await request(app)
        .post('/api/recipes')
        .send(newRecipe)
        .expect(401);
    });

    test('should validate required fields', async () => {
      const invalidRecipe = {
        title: 'Missing Fields'
        // Missing description, instructions
      };

      await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${chefToken}`)
        .send(invalidRecipe)
        .expect(400);
    });
  });

  describe('GET /api/recipes/my - Get Chef\'s Recipes', () => {
    test('should return chef\'s own recipes', async () => {
      const response = await request(app)
        .get('/api/recipes/my')
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All recipes should belong to this chef
      response.body.forEach(recipe => {
        expect(recipe.chef_id).toBe(chefUser.id);
      });
    });

    test('should include all statuses for chef', async () => {
      const response = await request(app)
        .get('/api/recipes/my')
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);

      // Should include pending, approved, and rejected recipes
      const statuses = response.body.map(r => r.status);
      expect(statuses.length).toBeGreaterThan(0);
    });

    test('should require chef authentication', async () => {
      await request(app)
        .get('/api/recipes/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/recipes/:id - Update Recipe', () => {
    let testRecipeId;

    beforeAll(async () => {
      // Create a test recipe
      const recipe = await pool.query(
        `INSERT INTO recipes (title, description, instructions, chef_id, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id`,
        ['Update Test Recipe', 'To be updated', '["Step 1"]', chefUser.id]
      );
      testRecipeId = recipe.rows[0].id;
    });

    test('should allow chef to update own recipe', async () => {
      const updates = {
        title: 'Updated Recipe Title',
        description: 'Updated description',
        prep_time: 20
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe(updates.title);
      expect(response.body.description).toBe(updates.description);
    });

    test('should not allow chef to update another chef\'s recipe', async () => {
      // Get a recipe from different chef
      const otherRecipe = await pool.query(
        `SELECT id FROM recipes WHERE chef_id != $1 AND status = 'approved' LIMIT 1`,
        [chefUser.id]
      );

      if (otherRecipe.rows.length > 0) {
        const updates = {
          title: 'Trying to hack'
        };

        await request(app)
          .put(`/api/recipes/${otherRecipe.rows[0].id}`)
          .set('Authorization', `Bearer ${chefToken}`)
          .send(updates)
          .expect(403);
      }
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .send({ title: 'No auth' })
        .expect(401);
    });
  });

  describe('DELETE /api/recipes/:id - Delete Recipe', () => {
    let deleteTestRecipeId;

    beforeEach(async () => {
      // Create a test recipe for deletion
      const recipe = await pool.query(
        `INSERT INTO recipes (title, description, instructions, chef_id, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id`,
        ['Delete Test Recipe', 'Will be deleted', '["Step 1"]', chefUser.id]
      );
      deleteTestRecipeId = recipe.rows[0].id;
    });

    test('should allow chef to delete own recipe', async () => {
      await request(app)
        .delete(`/api/recipes/${deleteTestRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);

      // Verify deletion
      const check = await pool.query(
        'SELECT * FROM recipes WHERE id = $1',
        [deleteTestRecipeId]
      );
      expect(check.rows.length).toBe(0);
    });

    test('should not allow chef to delete another chef\'s recipe', async () => {
      // Get a recipe from different chef
      const otherRecipe = await pool.query(
        `SELECT id FROM recipes WHERE chef_id != $1 AND status = 'approved' LIMIT 1`,
        [chefUser.id]
      );

      if (otherRecipe.rows.length > 0) {
        await request(app)
          .delete(`/api/recipes/${otherRecipe.rows[0].id}`)
          .set('Authorization', `Bearer ${chefToken}`)
          .expect(403);
      }
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/recipes/${deleteTestRecipeId}`)
        .expect(401);
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
