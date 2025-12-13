const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { aiGenerationLimiter } = require('../middleware/rateLimiter');
const { generateRecipe } = require('../services/recipeGenerator');
const { isConfigured } = require('../services/openai');

// Debug endpoint to check OpenAI configuration
router.get('/debug/openai', authenticate, requireRole(['admin']), (req, res) => {
  res.json({
    configured: isConfigured(),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/recipes/search
 * Search recipes with advanced filtering
 * 
 * Query Parameters:
 * - q: Text search in title/description
 * - ingredients: Comma-separated ingredient names (must include all)
 * - exclude: Comma-separated ingredients to exclude
 * - cuisine: Filter by cuisine type
 * - difficulty: Filter by difficulty (easy/medium/hard)
 * - maxTime: Maximum total cooking time in minutes
 * - minCalories: Minimum calories
 * - maxCalories: Maximum calories
 * - spice: Filter by spice level (mild/medium/hot)
 * - sort: Sort order (rating/time/calories/recent)
 * - page: Page number (default 1)
 * - limit: Results per page (default 12)
 */
router.get('/search', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    // Extract and parse query parameters
    const {
      q = '',
      ingredients = '',
      exclude = '',
      cuisine = '',
      difficulty = '',
      maxTime = '',
      minCalories = '',
      maxCalories = '',
      spice = '',
      sort = 'recent',
      page = '1',
      limit = '12'
    } = req.query;

    // Parse pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    let conditions = ['r.status = $1']; // Only approved recipes
    let params = ['approved'];
    let paramCount = 1;

    // Text search in title or description (with fuzzy matching using pg_trgm)
    if (q.trim()) {
      paramCount++;
      const searchTerm = q.trim();
      
      // Use pg_trgm similarity function for fuzzy matching
      // similarity() returns a value between 0 and 1
      // This handles typos like "chikcen" matching "chicken"
      conditions.push(`(
        r.title ILIKE $${paramCount} OR 
        r.description ILIKE $${paramCount} OR
        similarity(r.title, $${paramCount}) > 0.3 OR
        similarity(r.description, $${paramCount}) > 0.3
      )`);
      params.push(`%${searchTerm}%`);
    }

    // Cuisine filter
    if (cuisine.trim()) {
      paramCount++;
      conditions.push(`r.cuisine = $${paramCount}`);
      params.push(cuisine.trim());
    }

    // Difficulty filter
    if (difficulty.trim()) {
      paramCount++;
      conditions.push(`r.difficulty = $${paramCount}`);
      params.push(difficulty.trim());
    }

    // Max time filter (prep_time + cook_time)
    if (maxTime && !isNaN(maxTime)) {
      paramCount++;
      conditions.push(`(r.prep_time + r.cook_time) <= $${paramCount}`);
      params.push(parseInt(maxTime));
    }

    // Calorie range filters
    if (minCalories && !isNaN(minCalories)) {
      paramCount++;
      conditions.push(`r.calories >= $${paramCount}`);
      params.push(parseInt(minCalories));
    }

    if (maxCalories && !isNaN(maxCalories)) {
      paramCount++;
      conditions.push(`r.calories <= $${paramCount}`);
      params.push(parseInt(maxCalories));
    }

    // Spice level filter
    if (spice.trim()) {
      paramCount++;
      conditions.push(`r.spice_level = $${paramCount}`);
      params.push(spice.trim());
    }

    // Build base query
    let baseQuery = `
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
    `;

    // Handle ingredient inclusion filter
    if (ingredients.trim()) {
      const ingredientList = ingredients.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
      
      if (ingredientList.length > 0) {
        // Need to join with recipe_ingredients and ingredients table
        baseQuery = `
          FROM recipes r
          LEFT JOIN users u ON r.chef_id = u.id
          INNER JOIN recipe_ingredients ri ON r.id = ri.recipe_id
          INNER JOIN ingredients i ON ri.ingredient_id = i.id
        `;
        
        // Use multiple fuzzy matching strategies for typos like "chikcen" matching "chicken"
        const likeConditions = ingredientList.map((ingredient) => {
          // Strategy 1: Substring match
          paramCount++;
          params.push(`%${ingredient}%`);
          
          // Strategy 2: Character wildcard (handles typos with wrong order)
          paramCount++;
          const charPattern = ingredient.split('').join('%');
          params.push(`%${charPattern}%`);
          
          // Strategy 3: Similarity with lower threshold
          paramCount++;
          params.push(ingredient);
          
          return `(LOWER(i.name) LIKE $${paramCount - 2} OR LOWER(i.name) LIKE $${paramCount - 1} OR similarity(LOWER(i.name), LOWER($${paramCount})) > 0.2)`;
        }).join(' OR ');
        
        conditions.push(`(${likeConditions})`);
      }
    }

    // Handle ingredient exclusion filter
    if (exclude.trim()) {
      const excludeList = exclude.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
      
      if (excludeList.length > 0) {
        // Subquery to exclude recipes with these ingredients
        conditions.push(`
          r.id NOT IN (
            SELECT DISTINCT ri2.recipe_id
            FROM recipe_ingredients ri2
            INNER JOIN ingredients i2 ON ri2.ingredient_id = i2.id
            WHERE LOWER(i2.name) = ANY($${paramCount + 1}::text[])
          )
        `);
        paramCount++;
        params.push(excludeList);
      }
    }

    // Determine sort order and add necessary conditions
    let orderBy = 'ORDER BY r.created_at DESC'; // Default: newest first
    
    switch (sort) {
      case 'time':
        // Handle NULL values by filtering them out when sorting by time
        conditions.push('r.prep_time IS NOT NULL AND r.cook_time IS NOT NULL');
        orderBy = 'ORDER BY (r.prep_time + r.cook_time) ASC';
        break;
      case 'calories':
        // Handle NULL calories by filtering them out when sorting by calories
        conditions.push('r.calories IS NOT NULL');
        orderBy = 'ORDER BY r.calories ASC';
        break;
      case 'rating':
        // For now, sort by likes (can be enhanced later)
        orderBy = 'ORDER BY r.id DESC'; // Placeholder
        break;
      case 'recent':
      default:
        orderBy = 'ORDER BY r.created_at DESC';
    }

    // Build WHERE clause AFTER adding sort conditions
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      ${baseQuery}
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get recipes with pagination
    const recipesQuery = `
      SELECT DISTINCT r.*, 
             u.name as chef_name,
             (r.prep_time + r.cook_time) as total_time
      ${baseQuery}
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limitNum, offset);
    
    const recipesResult = await pool.query(recipesQuery, params);

    // Generate "Did you mean" suggestion if no results found
    let suggestion = null;
    if (total === 0) {
      console.log('No results found, checking for suggestions...');
      if (q.trim()) {
        console.log('Query term:', q.trim());
        // Find similar recipe names using similarity
        const suggestionQuery = `
          SELECT title, similarity(LOWER(title), LOWER($1)) as sim
          FROM recipes 
          WHERE status = 'approved'
          ORDER BY sim DESC
          LIMIT 1
        `;
        
        const suggestionResult = await pool.query(suggestionQuery, [q.trim()]);
        console.log('Suggestion result:', suggestionResult.rows.length > 0 ? suggestionResult.rows[0] : 'none');
        if (suggestionResult.rows.length > 0 && suggestionResult.rows[0].sim > 0.2) {
          const originalLower = q.trim().toLowerCase();
          const suggestionLower = suggestionResult.rows[0].title.toLowerCase();
          console.log(`Comparing: "${originalLower}" vs "${suggestionLower}", similarity: ${suggestionResult.rows[0].sim}`);
          if (originalLower !== suggestionLower && !suggestionLower.includes(originalLower)) {
            suggestion = {
              type: 'recipe',
              text: suggestionResult.rows[0].title
            };
            console.log('Suggestion created:', suggestion);
          } else {
            console.log('Suggestion excluded (exact match or substring)');
          }
        } else {
          console.log('No suggestion (low similarity or no results)');
        }
      } else if (ingredients.trim()) {
        // Find similar ingredient names using similarity
        const ingredientList = ingredients.split(',')[0].trim(); // Check first ingredient
        const suggestionQuery = `
          SELECT name, similarity(LOWER(name), LOWER($1)) as sim
          FROM ingredients
          ORDER BY sim DESC
          LIMIT 1
        `;
        
        const suggestionResult = await pool.query(suggestionQuery, [ingredientList]);
        if (suggestionResult.rows.length > 0 && suggestionResult.rows[0].sim > 0.2) {
          const originalLower = ingredientList.toLowerCase();
          const suggestionLower = suggestionResult.rows[0].name.toLowerCase();
          if (originalLower !== suggestionLower) {
            suggestion = {
              type: 'ingredient',
              text: suggestionResult.rows[0].name
            };
          }
        }
      }
    }

    // Normalize NULL values to 0 for numeric fields
    const normalizedRecipes = recipesResult.rows.map(recipe => ({
      ...recipe,
      prep_time: recipe.prep_time || 0,
      cook_time: recipe.cook_time || 0,
      calories: recipe.calories || 0,
      servings: recipe.servings || 0
    }));

    // Return response
    res.json({
      recipes: normalizedRecipes,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      suggestion
    });

  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ 
      error: 'Failed to search recipes',
      message: error.message 
    });
  }
});

/**
 * GET /api/recipes/featured
 * Get the current featured recipe
 */
router.get('/featured', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    const result = await pool.query(`
      SELECT r.*, u.name as chef_name
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      WHERE r.is_featured = true AND r.status = 'approved'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No featured recipe found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching featured recipe:', error);
    res.status(500).json({ error: 'Failed to fetch featured recipe' });
  }
});

/**
 * GET /api/recipes/popular
 * Get most liked recipes
 */
router.get('/popular', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const limit = parseInt(req.query.limit) || 8;

    const result = await pool.query(`
      SELECT r.*, 
             u.name as chef_name,
             COUNT(l.id) FILTER (WHERE l.is_like = true) as like_count
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      LEFT JOIN likes l ON r.id = l.recipe_id
      WHERE r.status = 'approved'
      GROUP BY r.id, u.name
      ORDER BY like_count DESC, r.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching popular recipes:', error);
    res.status(500).json({ error: 'Failed to fetch popular recipes' });
  }
});

/**
 * GET /api/recipes/recent
 * Get most recently added recipes
 */
router.get('/recent', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const limit = parseInt(req.query.limit) || 8;

    const result = await pool.query(`
      SELECT r.*, u.name as chef_name
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      WHERE r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recent recipes' });
  }
});
/**
 * POST /api/recipes
 * Create a new recipe (chef/admin only)
 */
router.post('/', authenticate, requireRole(['chef', 'admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      title,
      description,
      instructions,
      ingredients,
      prep_time,
      cook_time,
      servings,
      difficulty,
      cuisine,
      spice_level,
      calories,
      image_url
    } = req.body;

    // Validate required fields
    if (!title || !description || !instructions) {
      return res.status(400).json({ 
        error: 'Title, description, and instructions are required' 
      });
    }

    // Insert recipe
    const recipeResult = await pool.query(
      `INSERT INTO recipes (
        title, description, instructions, chef_id, 
        prep_time, cook_time, servings, difficulty, 
        cuisine, spice_level, calories, image_url, 
        status, source_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'chef')
      RETURNING *`,
      [
        title, 
        description, 
        JSON.stringify(instructions), 
        req.user.id,
        prep_time || null,
        cook_time || null,
        servings || null,
        difficulty || null,
        cuisine || null,
        spice_level || null,
        calories || null,
        image_url || null
      ]
    );

    const recipe = recipeResult.rows[0];

    // Insert ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        // Check if ingredient exists
        let ingredientResult = await pool.query(
          'SELECT id FROM ingredients WHERE LOWER(name) = LOWER($1)',
          [ing.name]
        );

        let ingredientId;
        if (ingredientResult.rows.length === 0) {
          // Create new ingredient
          const newIng = await pool.query(
            'INSERT INTO ingredients (name) VALUES ($1) RETURNING id',
            [ing.name]
          );
          ingredientId = newIng.rows[0].id;
        } else {
          ingredientId = ingredientResult.rows[0].id;
        }

        // Link to recipe
        await pool.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
          [recipe.id, ingredientId, ing.quantity || '', ing.unit || '']
        );
      }
    }

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

/**
 * GET /api/recipes/my
 * Get current chef's recipes (all statuses)
 */
router.get('/my', authenticate, requireRole(['chef', 'admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(
      `SELECT r.*, u.name as chef_name
       FROM recipes r
       JOIN users u ON r.chef_id = u.id
       WHERE r.chef_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chef recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

/**
 * PUT /api/recipes/:id
 * Update own recipe (chef/admin only)
 */
router.put('/:id', authenticate, requireRole(['chef', 'admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const {
      title,
      description,
      instructions,
      prep_time,
      cook_time,
      servings,
      difficulty,
      cuisine,
      spice_level,
      calories,
      image_url
    } = req.body;

    // Check if recipe exists and belongs to user (unless admin)
    const checkResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = checkResult.rows[0];

    // Check ownership (admin can edit any, chef can only edit own)
    if (req.user.role !== 'admin' && recipe.chef_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this recipe' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (instructions !== undefined) {
      updates.push(`instructions = $${paramCount++}`);
      values.push(JSON.stringify(instructions));
    }
    if (prep_time !== undefined) {
      updates.push(`prep_time = $${paramCount++}`);
      values.push(prep_time);
    }
    if (cook_time !== undefined) {
      updates.push(`cook_time = $${paramCount++}`);
      values.push(cook_time);
    }
    if (servings !== undefined) {
      updates.push(`servings = $${paramCount++}`);
      values.push(servings);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${paramCount++}`);
      values.push(difficulty);
    }
    if (cuisine !== undefined) {
      updates.push(`cuisine = $${paramCount++}`);
      values.push(cuisine);
    }
    if (spice_level !== undefined) {
      updates.push(`spice_level = $${paramCount++}`);
      values.push(spice_level);
    }
    if (calories !== undefined) {
      updates.push(`calories = $${paramCount++}`);
      values.push(calories);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const updateResult = await pool.query(
      `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete own recipe (chef/admin only)
 */
router.delete('/:id', authenticate, requireRole(['chef', 'admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    // Check if recipe exists and belongs to user (unless admin)
    const checkResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = checkResult.rows[0];

    // Check ownership (admin can delete any, chef can only delete own)
    if (req.user.role !== 'admin' && recipe.chef_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

    // Delete recipe (cascading will handle related records)
    await pool.query('DELETE FROM recipes WHERE id = $1', [id]);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

/**
 * GET /api/recipes/:id
 * Get single recipe by ID with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    // Get recipe details
    const recipeResult = await pool.query(`
      SELECT r.*, 
             u.name as chef_name,
             u.id as chef_id,
             COUNT(DISTINCT l.id) FILTER (WHERE l.is_like = true) as likes,
             COUNT(DISTINCT l.id) FILTER (WHERE l.is_like = false) as dislikes,
             COUNT(DISTINCT c.id) as comment_count
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      LEFT JOIN likes l ON r.id = l.recipe_id
      LEFT JOIN comments c ON r.id = c.recipe_id
      WHERE r.id = $1 AND r.status = 'approved'
      GROUP BY r.id, u.name, u.id
    `, [id]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Get ingredients
    const ingredientsResult = await pool.query(`
      SELECT i.name, ri.quantity, ri.unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = $1
      ORDER BY ri.id
    `, [id]);

    const recipe = recipeResult.rows[0];
    recipe.ingredients = ingredientsResult.rows;

    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

/**
 * POST /api/recipes/generate
 * Generate AI recipe from ingredients (auth required, rate limited)
 */
router.post('/generate', authenticate, aiGenerationLimiter, async (req, res) => {
  const pool = req.app.locals.pool;
  const userId = req.user.userId;
  
  try {
    // Check if OpenAI is configured
    if (!isConfigured()) {
      return res.status(503).json({ 
        error: 'AI recipe generation is currently unavailable. OpenAI API not configured.' 
      });
    }

    const { ingredients, preferences = {} } = req.body;

    // Validate input
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'Please provide at least one ingredient' 
      });
    }

    // Generate recipe using OpenAI
    const result = await generateRecipe(ingredients, preferences);
    const { recipe, usage } = result;

    // Track the generation for admin metrics
    try {
      await pool.query(
        `INSERT INTO ai_generations (user_id, ingredients, preferences, recipe_generated, tokens_used, success)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          ingredients,
          preferences,
          recipe,
          usage?.total_tokens || null,
          true
        ]
      );
    } catch (trackError) {
      console.error('Error tracking AI generation:', trackError);
      // Don't fail the request if tracking fails
    }

    // Return the generated recipe (don't save to DB yet)
    res.json({ 
      recipe: recipe,
      message: 'Recipe generated successfully. You can save it if you like it!'
    });

  } catch (error) {
    console.error('Error generating recipe:', error);
    
    // Track failed generation
    try {
      await pool.query(
        `INSERT INTO ai_generations (user_id, ingredients, preferences, success, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          req.body.ingredients || [],
          req.body.preferences || {},
          false,
          error.message
        ]
      );
    } catch (trackError) {
      console.error('Error tracking failed AI generation:', trackError);
    }
    
    if (error.message?.includes('API key')) {
      return res.status(503).json({ 
        error: 'AI service configuration error. Please contact support.' 
      });
    }
    
    if (error.message?.includes('parse')) {
      return res.status(500).json({ 
        error: 'Failed to generate recipe. Please try again with different ingredients.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate recipe. Please try again later.' 
    });
  }
});

module.exports = router;
