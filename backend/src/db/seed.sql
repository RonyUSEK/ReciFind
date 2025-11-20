-- ReciFind Database Seed Data
-- Demo data for development and testing
-- Created: November 19, 2025

-- Clear existing data (in correct order due to foreign keys)
TRUNCATE TABLE collection_recipes, recipe_collections, chat_sessions, reports, comments, likes, favorites, recipe_approvals, recipe_ingredients, ingredients, recipes, users RESTART IDENTITY CASCADE;

-- ============================================
-- USERS (3 per role = 9 total)
-- ============================================
-- Password for all demo users: "password123" (hashed with bcrypt, rounds=10)
-- Hash: $2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK (this is a placeholder - will need real bcrypt hash)

-- Regular Users (role: user)
INSERT INTO users (email, password_hash, name, role, bio, profile_image) VALUES
('john.doe@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'John Doe', 'user', 'Food lover and home cook. Always looking for new recipes to try!', 'https://i.pravatar.cc/150?img=12'),
('sarah.smith@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Sarah Smith', 'user', 'Vegetarian food enthusiast. Love trying healthy recipes.', 'https://i.pravatar.cc/150?img=23'),
('mike.johnson@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Mike Johnson', 'user', 'BBQ master and grilling expert. Meat is my specialty!', 'https://i.pravatar.cc/150?img=33');

-- Chefs (role: chef)
INSERT INTO users (email, password_hash, name, role, is_verified, reputation_score, bio, profile_image) VALUES
('chef.maria@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Chef Maria Garcia', 'chef', true, 60, 'Professional chef with 15 years experience in Italian cuisine. Sharing family recipes passed down through generations.', 'https://i.pravatar.cc/150?img=45'),
('chef.david@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Chef David Lee', 'chef', false, 20, 'Asian fusion chef specializing in modern takes on traditional dishes.', 'https://i.pravatar.cc/150?img=51'),
('chef.emma@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Chef Emma Wilson', 'chef', true, 55, 'Pastry chef and dessert specialist. Making sweet dreams come true!', 'https://i.pravatar.cc/150?img=26');

-- Admins (role: admin)
INSERT INTO users (email, password_hash, name, role, bio, profile_image) VALUES
('admin@recifind.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Admin User', 'admin', 'ReciFind platform administrator. Here to keep things running smoothly!', 'https://i.pravatar.cc/150?img=68'),
('moderator@recifind.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Jane Moderator', 'admin', 'Content moderator ensuring quality recipes for everyone.', 'https://i.pravatar.cc/150?img=47'),
('supervisor@recifind.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'Tom Supervisor', 'admin', 'Platform supervisor and chef approval specialist.', 'https://i.pravatar.cc/150?img=59');

-- ============================================
-- INGREDIENTS (Common cooking ingredients)
-- ============================================
INSERT INTO ingredients (name, category) VALUES
-- Proteins
('chicken breast', 'meats'),
('ground beef', 'meats'),
('salmon', 'seafood'),
('shrimp', 'seafood'),
('eggs', 'dairy'),
('tofu', 'proteins'),

-- Vegetables
('tomato', 'vegetables'),
('onion', 'vegetables'),
('garlic', 'vegetables'),
('bell pepper', 'vegetables'),
('spinach', 'vegetables'),
('broccoli', 'vegetables'),
('carrot', 'vegetables'),
('potato', 'vegetables'),
('mushroom', 'vegetables'),

-- Grains & Pasta
('rice', 'grains'),
('pasta', 'grains'),
('bread', 'grains'),
('flour', 'grains'),

-- Dairy
('milk', 'dairy'),
('cheese', 'dairy'),
('butter', 'dairy'),
('cream', 'dairy'),

-- Spices & Herbs
('salt', 'spices'),
('black pepper', 'spices'),
('olive oil', 'oils'),
('soy sauce', 'sauces'),
('basil', 'herbs'),
('oregano', 'herbs'),
('cumin', 'spices'),
('paprika', 'spices'),
('ginger', 'spices'),
('chili powder', 'spices'),

-- Other
('sugar', 'baking'),
('honey', 'sweeteners'),
('lemon', 'fruits'),
('lime', 'fruits'),
('cilantro', 'herbs'),
('parsley', 'herbs');

-- ============================================
-- RECIPES (10+ recipes with various statuses)
-- ============================================

-- Recipe 1: Approved, Featured, Chef Maria
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Classic Spaghetti Carbonara', 
'Authentic Italian pasta dish with eggs, cheese, and pancetta. Creamy without cream!',
'["Bring large pot of salted water to boil", "Cook spaghetti according to package directions until al dente", "While pasta cooks, whisk eggs and grated Parmesan cheese in a bowl", "Cook diced pancetta in a large skillet until crispy", "Drain pasta, reserving 1 cup pasta water", "Add hot pasta to skillet with pancetta", "Remove from heat and quickly stir in egg mixture, adding pasta water to create creamy sauce", "Season with black pepper and serve immediately with extra Parmesan"]',
4, 'chef', 'approved', true, 10, 15, 4, 'easy', 'Italian', 'mild', 520,
'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800');

-- Recipe 2: Approved, Chef Maria
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Margherita Pizza', 
'Traditional Neapolitan pizza with fresh mozzarella, tomatoes, and basil.',
'["Preheat oven to 475°F (245°C) with pizza stone inside", "Roll out pizza dough into 12-inch circle", "Spread tomato sauce evenly, leaving 1-inch border", "Tear fresh mozzarella and distribute over sauce", "Drizzle with olive oil and season with salt", "Bake for 10-12 minutes until crust is golden", "Remove from oven and top with fresh basil leaves", "Drizzle with more olive oil and serve hot"]',
4, 'chef', 'approved', false, 20, 12, 2, 'medium', 'Italian', 'mild', 280,
'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800');

-- Recipe 3: Approved, Chef David
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Teriyaki Salmon Bowl', 
'Glazed salmon over rice with vegetables and homemade teriyaki sauce.',
'["Cook rice according to package directions", "Mix soy sauce, honey, ginger, and garlic for teriyaki sauce", "Season salmon with salt and pepper", "Sear salmon skin-side down in hot pan for 4 minutes", "Flip and brush with teriyaki sauce, cook 3 more minutes", "Steam broccoli and carrots until tender-crisp", "Assemble bowl with rice, vegetables, and glazed salmon", "Drizzle with remaining teriyaki sauce and sesame seeds"]',
5, 'chef', 'approved', false, 15, 20, 2, 'easy', 'Asian', 'mild', 480,
'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800');

-- Recipe 4: Approved, Chef David
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Kung Pao Chicken', 
'Spicy Sichuan dish with chicken, peanuts, and vegetables in savory sauce.',
'["Cut chicken into bite-sized pieces and marinate with soy sauce", "Prepare sauce: mix soy sauce, rice vinegar, sugar, cornstarch", "Heat wok over high heat with oil", "Stir-fry chicken until golden, remove and set aside", "Add dried chilies, garlic, ginger to wok, stir-fry 30 seconds", "Add bell peppers and onions, stir-fry 2 minutes", "Return chicken to wok, add sauce and peanuts", "Toss everything together until sauce thickens, serve with rice"]',
5, 'chef', 'approved', false, 20, 15, 4, 'medium', 'Chinese', 'hot', 420,
'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800');

-- Recipe 5: Approved, Chef Emma
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Classic Chocolate Chip Cookies', 
'Soft and chewy cookies loaded with chocolate chips. The ultimate comfort dessert.',
'["Preheat oven to 375°F (190°C)", "Cream butter and sugars until fluffy", "Beat in eggs and vanilla extract", "Mix flour, baking soda, and salt in separate bowl", "Gradually add dry ingredients to wet ingredients", "Fold in chocolate chips", "Drop rounded tablespoons onto baking sheet, 2 inches apart", "Bake 9-11 minutes until edges are golden", "Cool on baking sheet 5 minutes before transferring"]',
6, 'chef', 'approved', false, 15, 10, 24, 'easy', 'American', 'mild', 150,
'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800');

-- Recipe 6: Approved, Chef Emma
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('New York Cheesecake', 
'Rich and creamy classic cheesecake with graham cracker crust.',
'["Preheat oven to 325°F (165°C)", "Mix graham cracker crumbs with melted butter, press into springform pan", "Beat cream cheese until smooth", "Add sugar, then eggs one at a time", "Mix in vanilla and sour cream", "Pour into crust and smooth top", "Bake 55-60 minutes until set but slightly jiggly in center", "Cool completely, then refrigerate 4 hours before serving", "Top with fresh berries or fruit compote"]',
6, 'chef', 'approved', false, 30, 60, 12, 'hard', 'American', 'mild', 380,
'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=800');

-- Recipe 7: Pending approval, Chef David
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Thai Green Curry', 
'Aromatic and spicy Thai curry with coconut milk and fresh vegetables.',
'["Heat oil in large pot over medium heat", "Add green curry paste and stir-fry 1 minute", "Add coconut milk and bring to simmer", "Add chicken pieces and cook 10 minutes", "Add bamboo shoots, bell peppers, and Thai basil", "Season with fish sauce and sugar", "Simmer 5 more minutes until vegetables are tender", "Serve hot over jasmine rice"]',
5, 'chef', 'pending', false, 15, 25, 4, 'medium', 'Thai', 'hot', 520,
'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800');

-- Recipe 8: Rejected, Chef David (needs improvement)
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Quick Fried Rice', 
'Simple fried rice with eggs and vegetables.',
'["Cook rice day before", "Heat wok with oil", "Add eggs and scramble", "Add rice and vegetables", "Stir-fry everything", "Add soy sauce", "Serve"]',
5, 'chef', 'rejected', false, 5, 10, 2, 'easy', 'Asian', 'mild', 320,
'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800');

-- Recipe 9: Approved, AI-generated
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Garlic Butter Shrimp Pasta', 
'Quick and easy pasta dish with succulent shrimp in garlic butter sauce.',
'["Cook pasta in salted boiling water until al dente", "While pasta cooks, season shrimp with salt and pepper", "Melt butter in large skillet over medium-high heat", "Add minced garlic and sauté 30 seconds", "Add shrimp and cook 2-3 minutes per side until pink", "Add cooked pasta to skillet with shrimp", "Toss with lemon juice, parsley, and pasta water", "Season with salt, pepper, and red pepper flakes", "Serve immediately with grated Parmesan"]',
NULL, 'ai', 'approved', false, 10, 15, 3, 'easy', 'Italian', 'mild', 450,
'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800');

-- Recipe 10: Approved, Vegetarian
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Creamy Spinach Mushroom Pasta', 
'Vegetarian pasta with sautéed mushrooms and spinach in creamy sauce.',
'["Cook pasta according to package directions", "Sauté sliced mushrooms in olive oil until golden", "Add minced garlic and cook 1 minute", "Add fresh spinach and wilt", "Pour in cream and bring to simmer", "Add grated Parmesan and stir until melted", "Toss cooked pasta with sauce", "Season with salt, pepper, and nutmeg", "Garnish with fresh parsley and extra Parmesan"]',
4, 'chef', 'approved', false, 10, 20, 4, 'easy', 'Italian', 'mild', 420,
'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800');

-- Recipe 11: Approved, Healthy Option
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Grilled Chicken Salad', 
'Fresh and healthy salad with grilled chicken, mixed greens, and balsamic dressing.',
'["Season chicken breast with salt, pepper, and olive oil", "Grill chicken 6-7 minutes per side until cooked through", "Let chicken rest 5 minutes, then slice", "Wash and dry mixed greens, cherry tomatoes, cucumber", "Arrange greens on plate with vegetables", "Top with sliced grilled chicken", "Drizzle with balsamic vinaigrette", "Add croutons and Parmesan shavings", "Serve immediately"]',
4, 'chef', 'approved', false, 15, 15, 2, 'easy', 'American', 'mild', 280,
'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800');

-- Recipe 12: Approved, Quick & Easy
INSERT INTO recipes (title, description, instructions, chef_id, source_type, status, is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories, image_url) VALUES
('Avocado Toast with Poached Egg', 
'Trendy breakfast classic - perfectly poached egg on smashed avocado toast.',
'["Toast bread slices until golden brown", "Bring small pot of water to gentle simmer, add vinegar", "Crack egg into small bowl", "Create whirlpool in water and gently slide egg in", "Poach 3-4 minutes until white is set", "Mash avocado with lime juice, salt, and pepper", "Spread avocado on toast", "Top with poached egg", "Season with red pepper flakes and everything bagel seasoning"]',
6, 'chef', 'approved', false, 5, 5, 1, 'easy', 'American', 'mild', 320,
'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800');

-- ============================================
-- RECIPE INGREDIENTS (link recipes to ingredients)
-- ============================================

-- Recipe 1: Spaghetti Carbonara
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(1, 17, '400', 'g'), -- pasta
(1, 5, '4', 'large'), -- eggs
(1, 22, '100', 'g'), -- cheese
(1, 26, '1', 'tsp'), -- black pepper
(1, 25, '1', 'tsp'); -- salt

-- Recipe 2: Margherita Pizza
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(2, 7, '3', 'large'), -- tomato
(2, 22, '200', 'g'), -- cheese
(2, 29, '10', 'leaves'), -- basil
(2, 27, '2', 'tbsp'), -- olive oil
(2, 25, '1', 'tsp'); -- salt

-- Recipe 3: Teriyaki Salmon
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(3, 3, '2', 'fillets'), -- salmon
(3, 16, '2', 'cups'), -- rice
(3, 28, '1/4', 'cup'), -- soy sauce
(3, 36, '2', 'tbsp'), -- honey
(3, 33, '1', 'tbsp'), -- ginger
(3, 9, '2', 'cloves'), -- garlic
(3, 12, '1', 'cup'), -- broccoli
(3, 13, '1', 'cup'); -- carrot

-- Recipe 4: Kung Pao Chicken
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(4, 1, '500', 'g'), -- chicken breast
(4, 8, '1', 'large'), -- onion
(4, 9, '4', 'cloves'), -- garlic
(4, 10, '2', 'medium'), -- bell pepper
(4, 28, '3', 'tbsp'), -- soy sauce
(4, 34, '1', 'tsp'), -- chili powder
(4, 33, '1', 'tbsp'); -- ginger

-- Recipe 5: Chocolate Chip Cookies
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(5, 19, '2.25', 'cups'), -- flour
(5, 23, '1', 'cup'), -- butter
(5, 35, '3/4', 'cup'), -- sugar
(5, 5, '2', 'large'); -- eggs

-- Recipe 6: New York Cheesecake
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(6, 22, '900', 'g'), -- cheese (cream cheese)
(6, 35, '1', 'cup'), -- sugar
(6, 5, '4', 'large'), -- eggs
(6, 24, '1', 'cup'); -- cream

-- Recipe 7: Thai Green Curry (Pending)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(7, 1, '500', 'g'), -- chicken breast
(7, 21, '400', 'ml'), -- milk (coconut milk)
(7, 10, '1', 'large'), -- bell pepper
(7, 29, '1', 'cup'); -- basil

-- Recipe 8: Quick Fried Rice (Rejected)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(8, 16, '3', 'cups'), -- rice
(8, 5, '2', 'large'), -- eggs
(8, 28, '2', 'tbsp'); -- soy sauce

-- Recipe 9: Garlic Butter Shrimp Pasta
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(9, 4, '400', 'g'), -- shrimp
(9, 17, '400', 'g'), -- pasta
(9, 23, '4', 'tbsp'), -- butter
(9, 9, '6', 'cloves'), -- garlic
(9, 37, '1', 'large'); -- lemon

-- Recipe 10: Creamy Spinach Mushroom Pasta
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(10, 17, '400', 'g'), -- pasta
(10, 15, '300', 'g'), -- mushroom
(10, 11, '200', 'g'), -- spinach
(10, 24, '1', 'cup'), -- cream
(10, 22, '1/2', 'cup'), -- cheese
(10, 9, '4', 'cloves'); -- garlic

-- Recipe 11: Grilled Chicken Salad
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(11, 1, '2', 'breasts'), -- chicken breast
(11, 11, '4', 'cups'), -- spinach (mixed greens)
(11, 7, '1', 'cup'), -- tomato
(11, 27, '3', 'tbsp'); -- olive oil

-- Recipe 12: Avocado Toast
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
(12, 18, '2', 'slices'), -- bread
(12, 5, '2', 'large'), -- eggs
(12, 37, '1', 'medium'); -- lemon (lime)

-- ============================================
-- RECIPE APPROVALS (approval history)
-- ============================================

-- Approved recipes by admin
INSERT INTO recipe_approvals (recipe_id, admin_id, status, feedback) VALUES
(1, 7, 'approved', 'Excellent authentic Italian recipe! Well detailed instructions.'),
(2, 7, 'approved', 'Perfect Margherita pizza. Great addition to our Italian collection.'),
(3, 9, 'approved', 'Healthy and delicious. Good balance of ingredients.'),
(4, 9, 'approved', 'Authentic Sichuan dish. Instructions are clear and detailed.'),
(5, 8, 'approved', 'Classic cookie recipe. Instructions are perfect for beginners.'),
(6, 8, 'approved', 'Outstanding cheesecake recipe. Professional level instructions.');

-- Rejected recipe with feedback
INSERT INTO recipe_approvals (recipe_id, admin_id, status, feedback) VALUES
(8, 9, 'rejected', 'Instructions are too brief. Please provide more detailed steps, specific measurements, and cooking temperatures. Also include prep work like what vegetables to use.');

-- ============================================
-- FAVORITES (users favoriting recipes)
-- ============================================

INSERT INTO favorites (user_id, recipe_id) VALUES
-- John (user 1) favorites
(1, 1), -- Carbonara
(1, 3), -- Teriyaki Salmon
(1, 9), -- Shrimp Pasta
-- Sarah (user 2) favorites
(2, 10), -- Spinach Mushroom Pasta
(2, 11), -- Grilled Chicken Salad
(2, 12), -- Avocado Toast
-- Mike (user 3) favorites
(3, 4), -- Kung Pao Chicken
(3, 1), -- Carbonara
-- Chef Maria favorites
(4, 3), -- Teriyaki Salmon
(4, 5); -- Cookies

-- ============================================
-- LIKES (users liking/disliking recipes)
-- ============================================

INSERT INTO likes (user_id, recipe_id, is_like) VALUES
-- Likes for Recipe 1 (Carbonara)
(1, 1, true),
(2, 1, true),
(3, 1, true),
(4, 1, true),
-- Likes for Recipe 3 (Teriyaki Salmon)
(1, 3, true),
(2, 3, true),
(4, 3, true),
-- Mixed likes/dislikes for Recipe 4 (Kung Pao - spicy!)
(1, 4, false), -- too spicy for John
(3, 4, true),
-- Likes for Recipe 5 (Cookies)
(1, 5, true),
(2, 5, true),
(3, 5, true),
-- Likes for Recipe 10 (Vegetarian)
(2, 10, true),
(4, 10, true),
-- Likes for Recipe 11 (Healthy Salad)
(2, 11, true),
(1, 11, true);

-- ============================================
-- COMMENTS (user comments on recipes)
-- ============================================

INSERT INTO comments (recipe_id, user_id, content) VALUES
(1, 1, 'Absolutely delicious! Made this for dinner tonight and my family loved it. The creamy sauce was perfect!'),
(1, 2, 'Great recipe! I added some peas for extra vegetables and it turned out amazing.'),
(3, 1, 'This is now my go-to salmon recipe. The teriyaki glaze is incredible!'),
(3, 3, 'Easy to follow instructions. Even as a beginner, I nailed this on the first try.'),
(5, 2, 'Best chocolate chip cookies ever! Soft and chewy, just how I like them.'),
(5, 1, 'Made these for a party and everyone asked for the recipe. Thank you Chef Emma!'),
(10, 2, 'Perfect vegetarian option! The creamy sauce is so good, I didn''t miss the meat at all.'),
(11, 2, 'Healthy and delicious! This is my new favorite lunch. The balsamic dressing is perfect.'),
(4, 1, 'Warning: This is SPICY! But if you like heat, it''s absolutely delicious. Adjust the chili to your preference.');

-- ============================================
-- REPORTS (flagged content - for demonstration)
-- ============================================

INSERT INTO reports (content_type, content_id, reporter_id, reason, description, status) VALUES
('comment', 9, 2, 'inappropriate', 'Comment contains misleading warning about spice level', 'pending'),
('recipe', 8, 1, 'incorrect', 'Instructions are incomplete and could lead to food safety issues', 'resolved');

-- Mark the resolved report
UPDATE reports SET reviewed_by = 9, resolved_at = CURRENT_TIMESTAMP WHERE id = 2;

-- ============================================
-- CHAT SESSIONS (sample AI chat history)
-- ============================================

INSERT INTO chat_sessions (user_id, messages) VALUES
(1, '[
    {"role": "user", "content": "How do I know when pasta is al dente?", "timestamp": "2025-11-19T10:30:00Z"},
    {"role": "assistant", "content": "Pasta is al dente when it''s cooked through but still has a slight firmness when you bite it. It should have a tiny white dot in the center when you cut it. Typically 1-2 minutes less than package directions. The best way is to taste it!", "timestamp": "2025-11-19T10:30:15Z"},
    {"role": "user", "content": "What can I substitute for eggs in baking?", "timestamp": "2025-11-19T10:35:00Z"},
    {"role": "assistant", "content": "Great question! Common egg substitutes include: 1 tablespoon ground flaxseed + 3 tablespoons water (let sit 5 min), 1/4 cup applesauce, 1/4 cup mashed banana, or 1/4 cup yogurt. Each works best for different recipes!", "timestamp": "2025-11-19T10:35:12Z"}
]'::jsonb),
(2, '[
    {"role": "user", "content": "How long can I store cooked rice in the fridge?", "timestamp": "2025-11-19T14:20:00Z"},
    {"role": "assistant", "content": "Cooked rice can be safely stored in the fridge for 4-6 days in an airtight container. Make sure to cool it quickly after cooking and refrigerate within 1 hour. Reheat thoroughly until steaming hot before eating!", "timestamp": "2025-11-19T14:20:10Z"}
]'::jsonb);

-- ============================================
-- RECIPE COLLECTIONS (LOW PRIORITY - sample data)
-- ============================================

INSERT INTO recipe_collections (user_id, name, description, is_public) VALUES
(1, 'Quick Weeknight Dinners', 'Easy recipes I can make after work in under 30 minutes', true),
(2, 'Healthy Meal Prep', 'Nutritious recipes for weekly meal prep', true),
(4, 'Italian Favorites', 'My collection of authentic Italian recipes', true);

-- ============================================
-- COLLECTION RECIPES (link recipes to collections)
-- ============================================

INSERT INTO collection_recipes (collection_id, recipe_id) VALUES
-- Quick Weeknight Dinners collection
(1, 1), -- Carbonara
(1, 3), -- Teriyaki Salmon
(1, 9), -- Shrimp Pasta
(1, 12), -- Avocado Toast
-- Healthy Meal Prep collection
(2, 11), -- Grilled Chicken Salad
(2, 3), -- Teriyaki Salmon
(2, 10), -- Spinach Pasta
-- Italian Favorites collection
(3, 1), -- Carbonara
(3, 2); -- Margherita Pizza

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
    user_count INTEGER;
    recipe_count INTEGER;
    ingredient_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO recipe_count FROM recipes;
    SELECT COUNT(*) INTO ingredient_count FROM ingredients;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ReciFind database seeded successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users created: %', user_count;
    RAISE NOTICE '  - Regular users: 3';
    RAISE NOTICE '  - Chefs: 3';
    RAISE NOTICE '  - Admins: 3';
    RAISE NOTICE 'Recipes created: %', recipe_count;
    RAISE NOTICE '  - Approved: 10';
    RAISE NOTICE '  - Pending: 1';
    RAISE NOTICE '  - Rejected: 1';
    RAISE NOTICE 'Ingredients: %', ingredient_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Demo Login Credentials:';
    RAISE NOTICE '  User: john.doe@example.com';
    RAISE NOTICE '  Chef: chef.maria@example.com';
    RAISE NOTICE '  Admin: admin@recifind.com';
    RAISE NOTICE '  Password: password123';
    RAISE NOTICE '========================================';
END $$;
