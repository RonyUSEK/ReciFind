const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');
const { generateToken } = require('../src/utils/jwt');

// Use test database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Collections API', () => {
  let user;
  let otherUser;
  let userToken;
  let otherToken;
  const createdCollectionIds = new Set();

  beforeAll(async () => {
    const userResult = await pool.query("SELECT * FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 2");
    user = userResult.rows[0];
    otherUser = userResult.rows[1] || userResult.rows[0];

    userToken = generateToken(user);
    otherToken = generateToken(otherUser);
  });

  afterAll(async () => {
    if (createdCollectionIds.size > 0) {
      await pool.query('DELETE FROM recipe_collections WHERE id = ANY($1::int[])', [Array.from(createdCollectionIds)]);
    }
    await pool.end();
  });

  test('GET /api/collections/my requires auth', async () => {
    await request(app).get('/api/collections/my').expect(401);
  });

  test('POST /api/collections rejects reserved name "Saved"', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Saved', isPublic: true })
      .expect(400);

    expect(res.body.error).toMatch(/reserved/i);
  });

  test('GET /api/collections/my auto-creates Saved collection', async () => {
    const res = await request(app)
      .get('/api/collections/my')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body.collections)).toBe(true);
    const hasSaved = res.body.collections.some((c) => String(c.name).toLowerCase() === 'saved');
    expect(hasSaved).toBe(true);
  });

  test('POST /api/collections creates a collection and enforces unique name per user', async () => {
    const uniqueName = `My Playlist ${Date.now()}`;

    const created = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: uniqueName, isPublic: true, description: 'Test' })
      .expect(201);

    expect(created.body).toHaveProperty('collection');
    expect(created.body.collection.name).toBe(uniqueName);
    createdCollectionIds.add(created.body.collection.id);

    const dup = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: uniqueName, isPublic: false })
      .expect(409);

    expect(dup.body.error).toMatch(/already have a collection/i);
  });

  test('Saved toggle works for DB recipes', async () => {
    const recipeResult = await pool.query("SELECT id FROM recipes WHERE status = 'approved' ORDER BY id ASC LIMIT 1");
    const recipeId = recipeResult.rows[0]?.id;
    expect(recipeId).toBeTruthy();

    const status1 = await request(app)
      .get(`/api/collections/saved/status?recipeId=${recipeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(status1.body).toHaveProperty('saved');

    const toggled1 = await request(app)
      .post('/api/collections/saved/toggle')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipeId })
      .expect(200);

    expect(toggled1.body.saved).toBe(true);
    expect(toggled1.body.itemId).toBeTruthy();

    const status2 = await request(app)
      .get(`/api/collections/saved/status?recipeId=${recipeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(status2.body.saved).toBe(true);

    const toggled2 = await request(app)
      .post('/api/collections/saved/toggle')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipeId })
      .expect(200);

    expect(toggled2.body.saved).toBe(false);
  });

  test('Saved toggle works for AI recipes and status can be checked by aiKey', async () => {
    const aiRecipe = {
      title: `AI Test ${Date.now()}`,
      description: 'AI desc',
      ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
      instructions: ['Step 1'],
      servings: 2,
      prep_time: 5,
      cook_time: 10,
      calories: 123,
    };

    const toggled1 = await request(app)
      .post('/api/collections/saved/toggle')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ aiRecipe })
      .expect(200);

    expect(toggled1.body.saved).toBe(true);
    expect(toggled1.body.itemId).toBeTruthy();
    expect(toggled1.body.aiKey).toMatch(/^[a-f0-9]{64}$/);

    const status = await request(app)
      .get(`/api/collections/saved/status?aiKey=${toggled1.body.aiKey}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(status.body.saved).toBe(true);

    const toggled2 = await request(app)
      .post('/api/collections/saved/toggle')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ aiRecipe })
      .expect(200);

    expect(toggled2.body.saved).toBe(false);
  });

  test('Can add items to a collection; non-owner is denied', async () => {
    const uniqueName = `Private List ${Date.now()}`;

    const created = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: uniqueName, isPublic: false })
      .expect(201);

    const collectionId = created.body.collection.id;
    createdCollectionIds.add(collectionId);

    const recipeResult = await pool.query("SELECT id FROM recipes WHERE status = 'approved' ORDER BY id ASC LIMIT 1");
    const recipeId = recipeResult.rows[0]?.id;

    await request(app)
      .post(`/api/collections/${collectionId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipeId })
      .expect(201);

    const aiRecipe = {
      title: `AI In List ${Date.now()}`,
      ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
      instructions: ['Boil'],
    };

    const addedAi = await request(app)
      .post(`/api/collections/${collectionId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ aiRecipe })
      .expect(201);

    expect(addedAi.body).toHaveProperty('aiKey');

    const items = await request(app)
      .get(`/api/collections/${collectionId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(items.body.collection.id).toBe(collectionId);
    expect(Array.isArray(items.body.items)).toBe(true);
    expect(items.body.items.some((i) => i.recipe_id === recipeId)).toBe(true);
    expect(items.body.items.some((i) => i.ai_recipe && i.ai_recipe.title === aiRecipe.title)).toBe(true);

    if (otherUser.id !== user.id) {
      await request(app)
        .post(`/api/collections/${collectionId}/items`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ recipeId })
        .expect(403);
    }
  });

  test('Public profile endpoint returns only public collections and includes items; AI view respects privacy', async () => {
    const recipeResult = await pool.query("SELECT id FROM recipes WHERE status = 'approved' ORDER BY id ASC LIMIT 1");
    const recipeId = recipeResult.rows[0]?.id;

    // public collection
    const pubName = `Public ${Date.now()}`;
    const pubCreated = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: pubName, isPublic: true })
      .expect(201);

    const pubId = pubCreated.body.collection.id;
    createdCollectionIds.add(pubId);

    const aiRecipePublic = {
      title: `AI Public ${Date.now()}`,
      ingredients: [{ name: 'pepper', quantity: 1, unit: 'tsp' }],
      instructions: ['Mix'],
    };

    await request(app)
      .post(`/api/collections/${pubId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipeId })
      .expect(201);

    const pubAiAdd = await request(app)
      .post(`/api/collections/${pubId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ aiRecipe: aiRecipePublic })
      .expect(201);

    // private collection (AI only)
    const privName = `Private ${Date.now()}`;
    const privCreated = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: privName, isPublic: false })
      .expect(201);

    const privId = privCreated.body.collection.id;
    createdCollectionIds.add(privId);

    const aiRecipePrivate = {
      title: `AI Private ${Date.now()}`,
      ingredients: [{ name: 'oil', quantity: 1, unit: 'tbsp' }],
      instructions: ['Cook'],
    };

    const privAiAdd = await request(app)
      .post(`/api/collections/${privId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ aiRecipe: aiRecipePrivate })
      .expect(201);

    const profile = await request(app)
      .get(`/api/collections/public/${user.id}`)
      .expect(200);

    expect(profile.body.user.id).toBe(user.id);
    expect(profile.body.collections.some((c) => c.name === pubName)).toBe(true);
    expect(profile.body.collections.some((c) => c.name === privName)).toBe(false);

    const pubCollection = profile.body.collections.find((c) => c.name === pubName);
    expect(pubCollection.items.some((i) => i.recipe_id === recipeId)).toBe(true);
    const pubAiItem = pubCollection.items.find((i) => i.ai_recipe && i.ai_recipe.title === aiRecipePublic.title);
    expect(pubAiItem).toBeTruthy();

    // AI view for public item should succeed without auth
    await request(app)
      .get(`/api/collections/ai/${pubAiItem.item_id}`)
      .expect(200);

    // AI view for private item should fail without auth
    await request(app)
      .get(`/api/collections/ai/${privAiAdd.body.itemId}`)
      .expect(403);
  });

  test('PATCH /api/collections/:id updates name and public flag; non-owner denied; Saved cannot be edited', async () => {
    const created = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Edit Me ${Date.now()}`, isPublic: false })
      .expect(201);

    const collectionId = created.body.collection.id;
    createdCollectionIds.add(collectionId);

    const renamed = await request(app)
      .patch(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Renamed ${Date.now()}`, isPublic: true })
      .expect(200);

    expect(renamed.body.collection).toBeTruthy();
    expect(renamed.body.collection.is_public).toBe(true);

    if (otherUser.id !== user.id) {
      await request(app)
        .patch(`/api/collections/${collectionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: `Nope ${Date.now()}` })
        .expect(403);
    }

    // Saved cannot be edited
    const mine = await request(app)
      .get('/api/collections/my')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const saved = (mine.body.collections || []).find((c) => String(c.name || '').toLowerCase() === 'saved');
    expect(saved?.id).toBeTruthy();

    await request(app)
      .patch(`/api/collections/${saved.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Anything' })
      .expect(400);
  });

  test('DELETE /api/collections/:id deletes collection; Saved cannot be deleted', async () => {
    const created = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Delete Me ${Date.now()}`, isPublic: false })
      .expect(201);

    const collectionId = created.body.collection.id;

    await request(app)
      .delete(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // No cleanup needed for this id now, but keep safe if delete failed
    createdCollectionIds.delete(collectionId);

    const mine = await request(app)
      .get('/api/collections/my')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const saved = (mine.body.collections || []).find((c) => String(c.name || '').toLowerCase() === 'saved');
    expect(saved?.id).toBeTruthy();

    await request(app)
      .delete(`/api/collections/${saved.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });
});
