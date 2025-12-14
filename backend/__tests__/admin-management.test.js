const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');
const { generateToken } = require('../src/utils/jwt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Admin management API', () => {
  let adminToken;
  let chefToken;
  let adminUserId;
  let createdUserId;
  let createdRecipeId;
  let createdIngredientId;

  beforeAll(async () => {
    const adminRes = await pool.query("SELECT * FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    const chefRes = await pool.query("SELECT * FROM users WHERE role = 'chef' ORDER BY id ASC LIMIT 1");
    const adminUser = adminRes.rows[0];
    const chefUser = chefRes.rows[0];

    expect(adminUser).toBeTruthy();
    expect(chefUser).toBeTruthy();

    adminToken = generateToken(adminUser);
    chefToken = generateToken(chefUser);
    adminUserId = adminUser.id;
  });

  afterAll(async () => {
    if (createdRecipeId) {
      await pool.query('DELETE FROM recipes WHERE id = $1', [createdRecipeId]);
    }
    if (createdIngredientId) {
      await pool.query('DELETE FROM ingredients WHERE id = $1', [createdIngredientId]);
    }
    if (createdUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
    }
    await pool.end();
  });

  test('Admin can update and delete a user', async () => {
    const ts = Date.now();
    const email = `admin.mgmt.${ts}@example.com`;

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Temp User' })
      .expect(201);

    createdUserId = reg.body.user.id;

    const updatedEmail = `admin.mgmt.${ts}.updated@example.com`;
    const patch = await request(app)
      .patch(`/api/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name', email: updatedEmail })
      .expect(200);

    expect(patch.body.user.name).toBe('Updated Name');
    expect(patch.body.user.email).toBe(updatedEmail);

    await request(app)
      .delete(`/api/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    createdUserId = null;
  });

  test('Admin can create/edit/delete ingredients', async () => {
    const ts = Date.now();
    const name = `TestIngredient${ts}`;

    const created = await request(app)
      .post('/api/admin/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, category: 'test' })
      .expect(201);

    createdIngredientId = created.body.ingredient.id;

    const patched = await request(app)
      .patch(`/api/admin/ingredients/${createdIngredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'updated' })
      .expect(200);

    expect(patched.body.ingredient.category).toBe('updated');

    await request(app)
      .delete(`/api/admin/ingredients/${createdIngredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    createdIngredientId = null;
  });

  test('Admin can list, update, and delete recipes', async () => {
    const newRecipe = {
      title: `Admin Manage Recipe ${Date.now()}`,
      description: 'Recipe for admin management test',
      instructions: ['Step 1'],
      ingredients: [{ name: 'salt', quantity: '1', unit: 'tsp' }],
      prep_time: 1,
      cook_time: 1,
      servings: 1,
      difficulty: 'easy',
      cuisine: 'Test',
      spice_level: 'mild',
      calories: 10,
    };

    const created = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${chefToken}`)
      .send(newRecipe)
      .expect(201);

    createdRecipeId = created.body.id;

    const list = await request(app)
      .get('/api/admin/recipes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(list.body.recipes)).toBe(true);
    expect(list.body.recipes.some((r) => r.id === createdRecipeId)).toBe(true);

    const ts = Date.now();
    const ingName = `AdminAutoIng${ts}`;

    const patch = await request(app)
      .patch(`/api/admin/recipes/${createdRecipeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Updated ${newRecipe.title}`,
        description: 'Updated description',
        instructions: ['Step A', 'Step B'],
        ingredients: [
          { name: 'salt', quantity: '2', unit: 'tsp' },
          { name: ingName, quantity: '1', unit: 'pinch' },
        ],
        chef_id: adminUserId,
        status: 'approved',
        deleted: true,
      })
      .expect(200);

    expect(patch.body.recipe.status).toBe('approved');
    expect(patch.body.recipe.deleted_at).toBeTruthy();
    expect(patch.body.recipe.chef_id).toBe(adminUserId);

    const links = await pool.query(
      `SELECT i.name, ri.quantity, ri.unit
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1
       ORDER BY i.name ASC`,
      [createdRecipeId]
    );
    const names = links.rows.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['salt', ingName]));

    await request(app)
      .delete(`/api/admin/recipes/${createdRecipeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    createdRecipeId = null;
  });
});
