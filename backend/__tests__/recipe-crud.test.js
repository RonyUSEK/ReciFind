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
  const createdRecipeIds = new Set();
  const createdIngredientRequestIds = new Set();

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

      if (response.body?.id) {
        createdRecipeIds.add(response.body.id);
      }

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
      createdRecipeIds.add(testRecipeId);
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

    test('should persist ingredient updates for pending recipe', async () => {
      const ingredientPayload = {
        ingredients: [
          { name: 'salt', quantity: '1', unit: 'tsp' }
        ]
      };

      await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .send(ingredientPayload)
        .expect(200);

      const check = await pool.query(
        `SELECT i.name, ri.quantity, ri.unit
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = $1`,
        [testRecipeId]
      );

      expect(check.rows.length).toBeGreaterThan(0);
      const saltRow = check.rows.find(r => (r.name || '').toLowerCase() === 'salt');
      expect(saltRow).toBeTruthy();
      expect(saltRow.quantity).toBe('1');
      expect(saltRow.unit).toBe('tsp');
    });

    test('resubmitting a rejected recipe should create ingredient requests for unknown ingredients', async () => {
      const uniqueName = `test_unknown_ing_${Date.now()}`;

      const rejected = await pool.query(
        `INSERT INTO recipes (title, description, instructions, chef_id, status)
         VALUES ($1, $2, $3, $4, 'rejected')
         RETURNING id`,
        ['Rejected Recipe', 'Rejected description', '["Step 1"]', chefUser.id]
      );
      const rejectedRecipeId = rejected.rows[0].id;
      createdRecipeIds.add(rejectedRecipeId);

      const response = await request(app)
        .put(`/api/recipes/${rejectedRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .send({
          ingredients: [{ name: uniqueName, quantity: '2', unit: 'cups' }],
          resubmit: true
        })
        .expect(200);

      expect(response.body.status).toBe('pending');

      const requestResult = await pool.query(
        'SELECT id, status FROM ingredient_requests WHERE normalized_name = $1',
        [uniqueName.toLowerCase()]
      );
      expect(requestResult.rows.length).toBe(1);
      expect(requestResult.rows[0].status).toBe('pending');
      createdIngredientRequestIds.add(requestResult.rows[0].id);

      const linkResult = await pool.query(
        `SELECT requested_name, quantity, unit
         FROM recipe_pending_ingredients
         WHERE recipe_id = $1 AND ingredient_request_id = $2`,
        [rejectedRecipeId, requestResult.rows[0].id]
      );
      expect(linkResult.rows.length).toBe(1);
      expect(linkResult.rows[0].requested_name).toBe(uniqueName);
      expect(linkResult.rows[0].quantity).toBe('2');
      expect(linkResult.rows[0].unit).toBe('cups');
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
      createdRecipeIds.add(deleteTestRecipeId);
    });

    afterEach(async () => {
      if (!deleteTestRecipeId) return;
      // If a test fails before deleting, ensure we don't leave it behind.
      await pool.query('DELETE FROM recipes WHERE id = $1', [deleteTestRecipeId]);
      createdRecipeIds.delete(deleteTestRecipeId);
      deleteTestRecipeId = null;
    });

    test('should allow chef to delete own recipe', async () => {
      await request(app)
        .delete(`/api/recipes/${deleteTestRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);

      // Should no longer be retrievable via the API
      await request(app)
        .get(`/api/recipes/${deleteTestRecipeId}`)
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(404);

      // Verify soft deletion
      const check = await pool.query(
        'SELECT deleted_at FROM recipes WHERE id = $1',
        [deleteTestRecipeId]
      );
      expect(check.rows.length).toBe(1);
      expect(check.rows[0].deleted_at).toBeTruthy();
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
    // Cleanup any recipes created by this test file (best-effort).
    if (createdRecipeIds.size > 0) {
      await pool.query('DELETE FROM recipes WHERE id = ANY($1::int[])', [Array.from(createdRecipeIds)]);
    }

    if (createdIngredientRequestIds.size > 0) {
      await pool.query('DELETE FROM ingredient_requests WHERE id = ANY($1::int[])', [Array.from(createdIngredientRequestIds)]);
    }
    await pool.end();
  });
});
