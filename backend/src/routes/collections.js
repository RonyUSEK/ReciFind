const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { authenticate, authenticateOptional } = require('../middleware/auth');

const SAVED_COLLECTION_NAME = 'Saved';

function normalizeCollectionName(name) {
  return String(name || '').trim();
}

function stableStringify(value) {
  // Deterministic JSON stringify for hashing
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function computeAiKey(aiRecipe) {
  const json = stableStringify(aiRecipe);
  return crypto.createHash('sha256').update(json).digest('hex');
}

async function getOrCreateSavedCollection(pool, userId) {
  const existing = await pool.query(
    'SELECT id, user_id, name, is_public FROM recipe_collections WHERE user_id = $1 AND name = $2',
    [userId, SAVED_COLLECTION_NAME]
  );

  if (existing.rows[0]) return existing.rows[0];

  const inserted = await pool.query(
    'INSERT INTO recipe_collections (user_id, name, is_public) VALUES ($1, $2, false) RETURNING id, user_id, name, is_public',
    [userId, SAVED_COLLECTION_NAME]
  );

  return inserted.rows[0];
}

async function assertCollectionOwner(pool, collectionId, userId) {
  const result = await pool.query(
    'SELECT id, user_id, name, is_public FROM recipe_collections WHERE id = $1',
    [collectionId]
  );
  const collection = result.rows[0];
  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }
  if (collection.user_id !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }
  return collection;
}

function pickAiRecipePayload(body) {
  // Minimal schema: accept common fields; store as-is so UI can render later.
  const aiRecipe = body?.aiRecipe;
  if (!aiRecipe || typeof aiRecipe !== 'object') return null;
  return aiRecipe;
}

/**
 * POST /api/collections
 * Create a collection (private or public)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;

    const name = normalizeCollectionName(req.body?.name);
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null;
    const isPublic = Boolean(req.body?.isPublic);

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    if (name.toLowerCase() === SAVED_COLLECTION_NAME.toLowerCase()) {
      return res.status(400).json({ error: 'This collection name is reserved' });
    }

    const result = await pool.query(
      `INSERT INTO recipe_collections (user_id, name, description, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, name, description, is_public, created_at`,
      [userId, name, description, isPublic]
    );

    return res.status(201).json({ collection: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'You already have a collection with this name' });
    }
    console.error('Error creating collection:', error);
    return res.status(500).json({ error: 'Failed to create collection' });
  }
});

/**
 * GET /api/collections/my
 * List current user's collections (includes auto-created Saved if it exists)
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;

    // Ensure Saved exists so UI can always target it
    await getOrCreateSavedCollection(pool, userId);

    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.is_public,
              (SELECT COUNT(*) FROM collection_recipes cr WHERE cr.collection_id = c.id) AS item_count,
              c.created_at
       FROM recipe_collections c
       WHERE c.user_id = $1
       ORDER BY (c.name = $2) DESC, c.created_at DESC`,
      [userId, SAVED_COLLECTION_NAME]
    );

    return res.json({ collections: result.rows });
  } catch (error) {
    console.error('Error listing collections:', error);
    return res.status(500).json({ error: 'Failed to load collections' });
  }
});

/**
 * GET /api/collections/saved/status?recipeId=123
 * GET /api/collections/saved/status?aiKey=<sha>
 */
router.get('/saved/status', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const recipeId = req.query.recipeId ? parseInt(req.query.recipeId, 10) : null;
    const aiKey = typeof req.query.aiKey === 'string' ? req.query.aiKey : null;

    if (!recipeId && !aiKey) {
      return res.status(400).json({ error: 'recipeId or aiKey is required' });
    }

    const savedCollection = await getOrCreateSavedCollection(pool, userId);

    const result = await pool.query(
      `SELECT id
       FROM collection_recipes
       WHERE collection_id = $1
         AND ((recipe_id IS NOT NULL AND recipe_id = $2) OR (ai_key IS NOT NULL AND ai_key = $3))
       LIMIT 1`,
      [savedCollection.id, recipeId, aiKey]
    );

    return res.json({ saved: Boolean(result.rows[0]), itemId: result.rows[0]?.id || null });
  } catch (error) {
    console.error('Error checking saved status:', error);
    return res.status(500).json({ error: 'Failed to check saved status' });
  }
});

/**
 * POST /api/collections/saved/toggle
 * Body: { recipeId } OR { aiRecipe }
 */
router.post('/saved/toggle', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;

    const recipeId = req.body?.recipeId ? parseInt(req.body.recipeId, 10) : null;
    const aiRecipe = pickAiRecipePayload(req.body);

    if (!recipeId && !aiRecipe) {
      return res.status(400).json({ error: 'recipeId or aiRecipe is required' });
    }

    const savedCollection = await getOrCreateSavedCollection(pool, userId);

    if (recipeId) {
      const existing = await pool.query(
        'SELECT id FROM collection_recipes WHERE collection_id = $1 AND recipe_id = $2 LIMIT 1',
        [savedCollection.id, recipeId]
      );

      if (existing.rows[0]) {
        await pool.query('DELETE FROM collection_recipes WHERE id = $1', [existing.rows[0].id]);
        return res.json({ saved: false, itemId: null });
      }

      const inserted = await pool.query(
        `INSERT INTO collection_recipes (collection_id, recipe_id)
         VALUES ($1, $2)
         RETURNING id`,
        [savedCollection.id, recipeId]
      );

      return res.json({ saved: true, itemId: inserted.rows[0].id });
    }

    const aiKey = computeAiKey(aiRecipe);

    const existing = await pool.query(
      'SELECT id FROM collection_recipes WHERE collection_id = $1 AND ai_key = $2 LIMIT 1',
      [savedCollection.id, aiKey]
    );

    if (existing.rows[0]) {
      await pool.query('DELETE FROM collection_recipes WHERE id = $1', [existing.rows[0].id]);
      return res.json({ saved: false, itemId: null, aiKey });
    }

    const inserted = await pool.query(
      `INSERT INTO collection_recipes (collection_id, ai_key, ai_recipe)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [savedCollection.id, aiKey, aiRecipe]
    );

    return res.json({ saved: true, itemId: inserted.rows[0].id, aiKey });
  } catch (error) {
    console.error('Error toggling saved:', error);
    return res.status(500).json({ error: 'Failed to save recipe' });
  }
});

/**
 * PATCH /api/collections/:id
 * Update collection (name/description/public)
 */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const collectionId = parseInt(req.params.id, 10);

    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ error: 'Invalid collection id' });
    }

    const collection = await assertCollectionOwner(pool, collectionId, userId);

    if (String(collection.name || '').toLowerCase() === SAVED_COLLECTION_NAME.toLowerCase()) {
      return res.status(400).json({ error: 'Saved collection cannot be edited' });
    }

    const nextName = req.body?.name != null ? normalizeCollectionName(req.body.name) : null;
    const nextDescription = req.body?.description != null
      ? (typeof req.body.description === 'string' ? req.body.description.trim() : '')
      : null;
    const hasIsPublic = Object.prototype.hasOwnProperty.call(req.body || {}, 'isPublic');
    const nextIsPublic = hasIsPublic ? Boolean(req.body.isPublic) : null;

    if (nextName !== null) {
      if (!nextName) {
        return res.status(400).json({ error: 'Collection name is required' });
      }
      if (nextName.toLowerCase() === SAVED_COLLECTION_NAME.toLowerCase()) {
        return res.status(400).json({ error: 'This collection name is reserved' });
      }
    }

    const result = await pool.query(
      `UPDATE recipe_collections
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_public = COALESCE($3, is_public)
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, name, description, is_public, created_at, updated_at`,
      [
        nextName,
        nextDescription,
        nextIsPublic,
        collectionId,
        userId,
      ]
    );

    return res.json({ collection: result.rows[0] });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'You already have a collection with this name' });
    }
    console.error('Error updating collection:', error);
    return res.status(500).json({ error: 'Failed to update collection' });
  }
});

/**
 * DELETE /api/collections/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const collectionId = parseInt(req.params.id, 10);

    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ error: 'Invalid collection id' });
    }

    const collection = await assertCollectionOwner(pool, collectionId, userId);
    if (String(collection.name || '').toLowerCase() === SAVED_COLLECTION_NAME.toLowerCase()) {
      return res.status(400).json({ error: 'Saved collection cannot be deleted' });
    }

    await pool.query('DELETE FROM recipe_collections WHERE id = $1 AND user_id = $2', [collectionId, userId]);
    return res.json({ success: true });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error deleting collection:', error);
    return res.status(500).json({ error: 'Failed to delete collection' });
  }
});

/**
 * POST /api/collections/:id/items
 * Body: { recipeId } OR { aiRecipe }
 */
router.post('/:id/items', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const collectionId = parseInt(req.params.id, 10);

    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ error: 'Invalid collection id' });
    }

    await assertCollectionOwner(pool, collectionId, userId);

    const recipeId = req.body?.recipeId ? parseInt(req.body.recipeId, 10) : null;
    const aiRecipe = pickAiRecipePayload(req.body);

    if (!recipeId && !aiRecipe) {
      return res.status(400).json({ error: 'recipeId or aiRecipe is required' });
    }

    if (recipeId) {
      const inserted = await pool.query(
        `INSERT INTO collection_recipes (collection_id, recipe_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [collectionId, recipeId]
      );
      return res.status(201).json({ itemId: inserted.rows[0]?.id || null });
    }

    const aiKey = computeAiKey(aiRecipe);
    const inserted = await pool.query(
      `INSERT INTO collection_recipes (collection_id, ai_key, ai_recipe)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [collectionId, aiKey, aiRecipe]
    );

    return res.status(201).json({ itemId: inserted.rows[0]?.id || null, aiKey });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error adding collection item:', error);
    return res.status(500).json({ error: 'Failed to add to collection' });
  }
});

/**
 * GET /api/collections/:id/items
 * Owner can view all items in their collection
 */
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const collectionId = parseInt(req.params.id, 10);

    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ error: 'Invalid collection id' });
    }

    const collection = await assertCollectionOwner(pool, collectionId, userId);

    const items = await pool.query(
      `SELECT cr.id AS item_id,
              cr.recipe_id,
              cr.ai_key,
              cr.ai_recipe,
              cr.created_at,
              r.title AS recipe_title,
              r.image_url AS recipe_image_url
       FROM collection_recipes cr
       LEFT JOIN recipes r ON cr.recipe_id = r.id
       WHERE cr.collection_id = $1
       ORDER BY cr.created_at DESC`,
      [collectionId]
    );

    return res.json({ collection, items: items.rows });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching collection items:', error);
    return res.status(500).json({ error: 'Failed to load collection' });
  }
});

/**
 * DELETE /api/collections/:id/items/:itemId
 */
router.delete('/:id/items/:itemId', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    const collectionId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (!Number.isFinite(collectionId) || !Number.isFinite(itemId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    await assertCollectionOwner(pool, collectionId, userId);

    const result = await pool.query(
      'DELETE FROM collection_recipes WHERE id = $1 AND collection_id = $2',
      [itemId, collectionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error deleting collection item:', error);
    return res.status(500).json({ error: 'Failed to remove item' });
  }
});

/**
 * GET /api/collections/public/:userId
 * Public profile collections (no auth required)
 */
router.get('/public/:userId', authenticateOptional, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = parseInt(req.params.userId, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const userResult = await pool.query(
      'SELECT id, name, bio, profile_image FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const collectionsResult = await pool.query(
      `SELECT id, name, description, is_public, created_at
       FROM recipe_collections
       WHERE user_id = $1 AND is_public = true
       ORDER BY created_at DESC`,
      [userId]
    );

    const collections = collectionsResult.rows;

    const itemsByCollection = {};
    for (const c of collections) {
      const items = await pool.query(
        `SELECT cr.id AS item_id,
                cr.recipe_id,
                cr.ai_key,
                cr.ai_recipe,
                cr.created_at,
                r.title AS recipe_title,
                r.image_url AS recipe_image_url
         FROM collection_recipes cr
         LEFT JOIN recipes r ON cr.recipe_id = r.id
         WHERE cr.collection_id = $1
         ORDER BY cr.created_at DESC`,
        [c.id]
      );
      itemsByCollection[c.id] = items.rows;
    }

    return res.json({ user, collections: collections.map((c) => ({ ...c, items: itemsByCollection[c.id] || [] })) });
  } catch (error) {
    console.error('Error fetching public collections:', error);
    return res.status(500).json({ error: 'Failed to load public collections' });
  }
});

/**
 * GET /api/collections/ai/:itemId
 * Fetch a saved AI recipe snapshot if owned by user OR included in a public collection.
 */
router.get('/ai/:itemId', authenticateOptional, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const itemId = parseInt(req.params.itemId, 10);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ error: 'Invalid item id' });
    }

    const result = await pool.query(
      `SELECT cr.id AS item_id, cr.ai_recipe, c.user_id, c.is_public
       FROM collection_recipes cr
       INNER JOIN recipe_collections c ON c.id = cr.collection_id
       WHERE cr.id = $1 AND cr.ai_recipe IS NOT NULL`,
      [itemId]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'AI recipe not found' });
    }

    const requesterId = req.user?.userId;
    const canView = row.is_public === true || (requesterId && row.user_id === requesterId);

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ itemId: row.item_id, aiRecipe: row.ai_recipe });
  } catch (error) {
    console.error('Error fetching saved AI recipe:', error);
    return res.status(500).json({ error: 'Failed to load AI recipe' });
  }
});

module.exports = router;
