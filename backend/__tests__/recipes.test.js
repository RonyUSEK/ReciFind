const request = require('supertest');
const app = require('../index');
const { Pool } = require('pg');

// Use test database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

describe('Recipe Search API', () => {
  // Test data will be seeded from seed.sql
  
  describe('GET /api/recipes/search', () => {
    
    test('should return all approved recipes when no filters applied', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .expect(200);
      
      expect(response.body).toHaveProperty('recipes');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.recipes)).toBe(true);
      
      // Should only return approved recipes (status='approved')
      const allApproved = response.body.recipes.every(r => r.status === 'approved');
      expect(allApproved).toBe(true);
    });

    test('should filter by text search in title', async () => {
      const response = await request(app)
        .get('/api/recipes/search?q=carbonara')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const hasCarbonaraInTitle = response.body.recipes.some(r => 
        r.title.toLowerCase().includes('carbonara')
      );
      expect(hasCarbonaraInTitle).toBe(true);
    });

    test('should filter by text search in description', async () => {
      const response = await request(app)
        .get('/api/recipes/search?q=creamy')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const hasMatchInDescription = response.body.recipes.some(r => 
        r.description.toLowerCase().includes('creamy')
      );
      expect(hasMatchInDescription).toBe(true);
    });

    test('should filter recipes by single ingredient', async () => {
      const response = await request(app)
        .get('/api/recipes/search?ingredients=chicken')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      // Each recipe should have chicken in ingredients
      // We'll verify this by checking the recipe has the ingredient relationship
    });

    test('should filter recipes by multiple ingredients', async () => {
      const response = await request(app)
        .get('/api/recipes/search?ingredients=pasta,garlic')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      // Recipes should contain both pasta and garlic
    });

    test('should exclude recipes with specific ingredients', async () => {
      const response = await request(app)
        .get('/api/recipes/search?exclude=shrimp')
        .expect(200);
      
      // Should not return shrimp pasta recipe
      const hasShrimpRecipe = response.body.recipes.some(r => 
        r.title.toLowerCase().includes('shrimp')
      );
      expect(hasShrimpRecipe).toBe(false);
    });

    test('should filter by cuisine type', async () => {
      const response = await request(app)
        .get('/api/recipes/search?cuisine=Italian')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const allItalian = response.body.recipes.every(r => r.cuisine === 'Italian');
      expect(allItalian).toBe(true);
    });

    test('should filter by difficulty level', async () => {
      const response = await request(app)
        .get('/api/recipes/search?difficulty=easy')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const allEasy = response.body.recipes.every(r => r.difficulty === 'easy');
      expect(allEasy).toBe(true);
    });

    test('should filter by max cooking time', async () => {
      const response = await request(app)
        .get('/api/recipes/search?maxTime=20')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const allUnderTime = response.body.recipes.every(r => 
        (r.prep_time + r.cook_time) <= 20
      );
      expect(allUnderTime).toBe(true);
    });

    test('should filter by calorie range', async () => {
      const response = await request(app)
        .get('/api/recipes/search?minCalories=300&maxCalories=500')
        .expect(200);
      
      if (response.body.recipes.length > 0) {
        const allInRange = response.body.recipes.every(r => 
          r.calories >= 300 && r.calories <= 500
        );
        expect(allInRange).toBe(true);
      }
    });

    test('should filter by spice level', async () => {
      const response = await request(app)
        .get('/api/recipes/search?spice=mild')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(0);
      const allMild = response.body.recipes.every(r => r.spice_level === 'mild');
      expect(allMild).toBe(true);
    });

    test('should sort recipes by cook time ascending', async () => {
      const response = await request(app)
        .get('/api/recipes/search?sort=time')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(1);
      // Check if sorted correctly (total time ascending)
      for (let i = 0; i < response.body.recipes.length - 1; i++) {
        const time1 = response.body.recipes[i].prep_time + response.body.recipes[i].cook_time;
        const time2 = response.body.recipes[i + 1].prep_time + response.body.recipes[i + 1].cook_time;
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });

    test('should sort recipes by calories ascending', async () => {
      const response = await request(app)
        .get('/api/recipes/search?sort=calories')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(1);
      // Check if sorted correctly
      for (let i = 0; i < response.body.recipes.length - 1; i++) {
        expect(response.body.recipes[i].calories).toBeLessThanOrEqual(
          response.body.recipes[i + 1].calories
        );
      }
    });

    test('should sort recipes by newest first', async () => {
      const response = await request(app)
        .get('/api/recipes/search?sort=recent')
        .expect(200);
      
      expect(response.body.recipes.length).toBeGreaterThan(1);
      // Check if sorted by created_at descending
      for (let i = 0; i < response.body.recipes.length - 1; i++) {
        const date1 = new Date(response.body.recipes[i].created_at);
        const date2 = new Date(response.body.recipes[i + 1].created_at);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    test('should paginate results correctly', async () => {
      const response1 = await request(app)
        .get('/api/recipes/search?page=1&limit=3')
        .expect(200);
      
      expect(response1.body.recipes.length).toBeLessThanOrEqual(3);
      expect(response1.body.page).toBe(1);
      expect(response1.body.limit).toBe(3);
      
      // Get second page
      const response2 = await request(app)
        .get('/api/recipes/search?page=2&limit=3')
        .expect(200);
      
      expect(response2.body.page).toBe(2);
      // Recipes on page 2 should be different from page 1
      if (response2.body.recipes.length > 0) {
        const firstPageIds = response1.body.recipes.map(r => r.id);
        const secondPageIds = response2.body.recipes.map(r => r.id);
        const hasOverlap = secondPageIds.some(id => firstPageIds.includes(id));
        expect(hasOverlap).toBe(false);
      }
    });

    test('should combine multiple filters correctly', async () => {
      const response = await request(app)
        .get('/api/recipes/search?cuisine=Italian&difficulty=easy&maxTime=30')
        .expect(200);
      
      if (response.body.recipes.length > 0) {
        const allMatch = response.body.recipes.every(r => 
          r.cuisine === 'Italian' && 
          r.difficulty === 'easy' &&
          (r.prep_time + r.cook_time) <= 30
        );
        expect(allMatch).toBe(true);
      }
    });

    test('should return empty array when no recipes match', async () => {
      const response = await request(app)
        .get('/api/recipes/search?cuisine=NonexistentCuisine')
        .expect(200);
      
      expect(response.body.recipes).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/recipes/search?maxTime=invalid')
        .expect(200);
      
      // Should still return results, ignoring invalid param
      expect(response.body).toHaveProperty('recipes');
    });

    test('should default to 12 recipes per page', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .expect(200);
      
      expect(response.body.limit).toBe(12);
      expect(response.body.recipes.length).toBeLessThanOrEqual(12);
    });

    test('should include recipe metadata in response', async () => {
      const response = await request(app)
        .get('/api/recipes/search?limit=1')
        .expect(200);
      
      if (response.body.recipes.length > 0) {
        const recipe = response.body.recipes[0];
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('description');
        expect(recipe).toHaveProperty('cuisine');
        expect(recipe).toHaveProperty('difficulty');
        expect(recipe).toHaveProperty('prep_time');
        expect(recipe).toHaveProperty('cook_time');
        expect(recipe).toHaveProperty('servings');
        expect(recipe).toHaveProperty('calories');
        expect(recipe).toHaveProperty('image_url');
      }
    });

  });

  // Cleanup after tests
  afterAll(async () => {
    await pool.end();
  });
});
