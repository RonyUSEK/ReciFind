-- ReciFind Database Schema
-- PostgreSQL 15+
-- Created: November 19, 2025

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean reinitialization)
DROP TABLE IF EXISTS collection_recipes CASCADE;
DROP TABLE IF EXISTS recipe_collections CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS recipe_approvals CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'chef', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    reputation_score INTEGER DEFAULT 0,
    bio TEXT,
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email and role for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions JSONB NOT NULL, -- Array of step strings: ["Step 1", "Step 2", ...]
    chef_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source_type VARCHAR(10) DEFAULT 'chef' CHECK (source_type IN ('ai', 'chef')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_featured BOOLEAN DEFAULT FALSE,
    prep_time INTEGER, -- Minutes
    cook_time INTEGER, -- Minutes
    servings INTEGER,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine VARCHAR(50),
    spice_level VARCHAR(20) CHECK (spice_level IN ('mild', 'medium', 'hot')),
    calories INTEGER,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on frequently queried columns
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_chef_id ON recipes(chef_id);
CREATE INDEX idx_recipes_is_featured ON recipes(is_featured);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);

-- Ingredients table
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) -- e.g., 'vegetables', 'meats', 'spices', 'dairy'
);

-- Create index on ingredient name for faster searches
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipe ingredients junction table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity VARCHAR(50), -- e.g., "2", "1/2", "2-3"
    unit VARCHAR(50), -- e.g., "cups", "grams", "tbsp", "pieces"
    UNIQUE(recipe_id, ingredient_id)
);

-- Create indexes for junction table
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Recipe approvals table (tracks admin review history)
CREATE TABLE recipe_approvals (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('approved', 'rejected')),
    feedback TEXT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on recipe_id for approval history lookups
CREATE INDEX idx_recipe_approvals_recipe_id ON recipe_approvals(recipe_id);
CREATE INDEX idx_recipe_approvals_admin_id ON recipe_approvals(admin_id);

-- Favorites table
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);

-- Create indexes for favorites
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_recipe_id ON favorites(recipe_id);

-- Likes table (true = like, false = dislike)
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true = like, false = dislike
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);

-- Create indexes for likes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_recipe_id ON likes(recipe_id);
CREATE INDEX idx_likes_is_like ON likes(is_like);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for comments
CREATE INDEX idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_is_flagged ON comments(is_flagged);

-- Reports table (for content moderation)
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('recipe', 'comment')),
    content_id INTEGER NOT NULL, -- ID of recipe or comment
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL, -- e.g., 'spam', 'inappropriate', 'incorrect', 'harassment'
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reports
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_content_type ON reports(content_type);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reviewed_by ON reports(reviewed_by);

-- Chat sessions table (for AI chatbot)
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {role: 'user'|'assistant', content: 'text', timestamp: '...'}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for chat sessions
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Recipe collections table (LOW PRIORITY - like Spotify playlists)
CREATE TABLE recipe_collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for collections
CREATE INDEX idx_recipe_collections_user_id ON recipe_collections(user_id);

-- Collection recipes junction table (LOW PRIORITY)
CREATE TABLE collection_recipes (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, recipe_id)
);

-- Create indexes for collection recipes
CREATE INDEX idx_collection_recipes_collection_id ON collection_recipes(collection_id);
CREATE INDEX idx_collection_recipes_recipe_id ON collection_recipes(recipe_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_collections_updated_at BEFORE UPDATE ON recipe_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'ReciFind database schema created successfully!';
END $$;
