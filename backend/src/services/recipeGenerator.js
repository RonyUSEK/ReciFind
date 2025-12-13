const { getOpenAIClient, isConfigured } = require('./openai');

/**
 * Generate a recipe using OpenAI based on ingredients and preferences
 * 
 * @param {string[]} ingredients - Array of ingredient names
 * @param {Object} preferences - User preferences (diet, maxTime, etc.)
 * @returns {Promise<Object>} Generated recipe object with usage metadata
 */
async function generateRecipe(ingredients, preferences = {}) {
  if (!isConfigured()) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }

  const openai = getOpenAIClient();
  
  // Build the prompt based on ingredients and preferences
  const ingredientsList = ingredients.join(', ');
  const dietInfo = preferences.diet && preferences.diet !== 'none' 
    ? `Dietary preference: ${preferences.diet}.` 
    : '';
  const timeInfo = preferences.maxTime 
    ? `Maximum cooking time: ${preferences.maxTime} minutes.` 
    : '';

  const prompt = `Create a recipe using: ${ingredientsList}. ${dietInfo} ${timeInfo}

JSON format:
{
  "title": "Recipe name",
  "description": "Brief description",
  "instructions": ["Step 1", "Step 2", "..."],
  "ingredients": [{"name": "ingredient", "quantity": "500", "unit": "g"}],
  "prep_time": 10,
  "cook_time": 20,
  "servings": 4,
  "difficulty": "easy",
  "cuisine": "Italian",
  "spice_level": "mild",
  "calories": 450
}

Rules: difficulty="easy|medium|hard", spice_level="mild|medium|hot", times in minutes, calories per serving.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a chef. Create recipes in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    // Parse the JSON response
    const recipe = JSON.parse(jsonContent);
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'instructions', 'ingredients'];
    for (const field of requiredFields) {
      if (!recipe[field]) {
        throw new Error(`Generated recipe missing required field: ${field}`);
      }
    }

    // Ensure instructions is an array
    if (!Array.isArray(recipe.instructions)) {
      throw new Error('Instructions must be an array');
    }

    // Ensure ingredients is an array with proper format
    if (!Array.isArray(recipe.ingredients)) {
      throw new Error('Ingredients must be an array');
    }

    // Return recipe with usage metadata for tracking
    return {
      recipe,
      usage: completion.usage || null
    };
  } catch (error) {
    console.error('Error generating recipe:', error);
    
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is invalid or expired.');
    }
    
    throw error;
  }
}

module.exports = {
  generateRecipe,
};
