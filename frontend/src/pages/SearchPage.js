import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import IngredientSearchBar from '../components/Common/IngredientSearchBar';
import { resolveImageUrl } from '../utils/resolveImageUrl';

const AI_INGREDIENT_SUGGESTIONS = [
  'Chicken', 'Beef', 'Salmon', 'Eggs', 'Tofu',
  'Garlic', 'Onion', 'Tomato', 'Potato', 'Broccoli',
  'Rice', 'Pasta', 'Bread', 'Milk', 'Cheese',
  'Olive Oil', 'Butter', 'Salt', 'Pepper', 'Basil'
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestion, setSuggestion] = useState(null); // For "Did you mean" feature
  
  // AI Generation states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [aiDraft, setAiDraft] = useState({
    dishIdea: '',
    ingredients: [],
    ingredientInput: '',
    extraInstructions: '',
  });
  const [aiCredits, setAiCredits] = useState({ limit: null, used: null, remaining: null });
  
  // Filter states
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    ingredients: searchParams.get('ingredients') || '',
    exclude: searchParams.get('exclude') || '',
    cuisine: searchParams.get('cuisine') || '',
    difficulty: searchParams.get('difficulty') || '',
    maxTime: searchParams.get('maxTime') || '',
    minCalories: searchParams.get('minCalories') || '',
    maxCalories: searchParams.get('maxCalories') || '',
    spice: searchParams.get('spice') || '',
    sort: searchParams.get('sort') || 'recent',
  });

  useEffect(() => {
    fetchRecipes();
    // If navigated here with an AI intent flag, open the AI editor (but do not generate automatically)
    const shouldOpenAI = searchParams.get('ai') === '1' || searchParams.get('ai') === 'true' || searchParams.get('generateAI') === 'true';
    if (shouldOpenAI) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('ai');
      newParams.delete('generateAI');
      setSearchParams(newParams, { replace: true });
      openAIModal();
    }
  }, [searchParams]);

  const deriveInitialAIDraft = () => {
    const dishIdea = (searchParams.get('q') || filters.q || '').trim();
    const ingredientsFromQuery = (searchParams.get('ingredients') || filters.ingredients || '')
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);

    const ingredientsFromText = dishIdea
      ? dishIdea
          .split(/\s+/)
          .map(s => s.trim())
          .filter(s => s.length >= 3)
      : [];

    const merged = Array.from(new Set([
      ...ingredientsFromQuery,
      ...(ingredientsFromQuery.length ? [] : ingredientsFromText),
    ].map(s => s.toLowerCase())));

    return {
      dishIdea,
      ingredients: merged,
      ingredientInput: '',
      extraInstructions: '',
    };
  };

  const openAIModal = () => {
    if (!user) {
      alert('Please log in to generate AI recipes');
      navigate('/login');
      return;
    }

    setAiError(null);
    setGeneratedRecipe(null);
    setAiDraft(deriveInitialAIDraft());
    setShowAIModal(true);

    // Best-effort: show remaining credits before the user generates
    api.get('/api/recipes/ai-credits')
      .then((res) => {
        const limit = parseInt(res.data?.dailyLimit);
        const used = parseInt(res.data?.usedToday);
        const remaining = parseInt(res.data?.remainingToday);
        if (!Number.isNaN(limit) && !Number.isNaN(used) && !Number.isNaN(remaining)) {
          setAiCredits({ limit, used, remaining });
        }
      })
      .catch(() => {
        // ignore
      });
  };

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = searchParams.get(key) || filters[key];
        if (value) {
          params.append(key, value);
        }
      });
      
      params.append('page', searchParams.get('page') || '1');
      params.append('limit', '12');

      const response = await api.get('/api/recipes/search', { params });
      
      setRecipes(response.data.recipes);
      setTotalResults(response.data.total);
      setCurrentPage(response.data.page);
      setTotalPages(response.data.totalPages);
      setSuggestion(response.data.suggestion || null); // Store suggestion from backend
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters) => {
    const params = new URLSearchParams();
    
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key]) {
        params.append(key, newFilters[key]);
      }
    });
    
    setSearchParams(params);
    setFilters(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      q: '',
      ingredients: '',
      exclude: '',
      cuisine: '',
      difficulty: '',
      maxTime: '',
      minCalories: '',
      maxCalories: '',
      spice: '',
      sort: 'recent',
    };
    setFilters(clearedFilters);
    setSearchParams(new URLSearchParams({ sort: 'recent' }));
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitAIGeneration = async () => {
    const ingredients = (aiDraft.ingredients || []).map(s => s.trim()).filter(Boolean);
    if (ingredients.length === 0) {
      setAiError('Please add at least one ingredient.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setGeneratedRecipe(null);

    try {
      const response = await api.post('/api/recipes/generate', {
        ingredients,
        preferences: {
          cuisine: filters.cuisine || null,
          difficulty: filters.difficulty || null,
          spice: filters.spice || null,
          maxTime: filters.maxTime ? parseInt(filters.maxTime) : null,
          dishIdea: (aiDraft.dishIdea || '').trim() || null,
          extraInstructions: (aiDraft.extraInstructions || '').trim() || null,
        }
      });

      const limit = parseInt(response.headers?.['x-ai-daily-limit']);
      const used = parseInt(response.headers?.['x-ai-daily-used']);
      const remaining = parseInt(response.headers?.['x-ai-daily-remaining']);
      if (!Number.isNaN(limit) && !Number.isNaN(used) && !Number.isNaN(remaining)) {
        setAiCredits({ limit, used, remaining });
      }

      setGeneratedRecipe(response.data.recipe);
    } catch (error) {
      console.error('AI generation error:', error);

      if (error.response?.status === 429) {
        const remaining = error.response?.data?.remaining;
        const limit = error.response?.data?.limit;
        const used = error.response?.data?.used;
        if (typeof remaining === 'number' && typeof limit === 'number' && typeof used === 'number') {
          setAiCredits({ limit, used, remaining });
        }
        setAiError(error.response?.data?.error || 'Daily AI generation limit reached. Please try again tomorrow.');
      } else if (error.response?.status === 401) {
        setAiError('Please log in to generate recipes');
      } else if (error.response?.data?.error) {
        setAiError(error.response.data.error);
      } else {
        setAiError('Failed to generate recipe. Please try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const closeAIModal = () => {
    setShowAIModal(false);
    setGeneratedRecipe(null);
    setAiError(null);
  };

  const findRealRecipesLikeThis = (recipe) => {
    const names = (recipe?.ingredients || []).map(i => i?.name).filter(Boolean);
    const unique = Array.from(new Set(names.map(s => String(s).toLowerCase()))).slice(0, 8);
    if (unique.length === 0) return;
    const params = new URLSearchParams();
    params.append('ingredients', unique.join(','));
    navigate(`/search?${params.toString()}`);
    closeAIModal();
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'recent').length;

  return (
    <div className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Search Recipes
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Found {totalResults} recipe{totalResults !== 1 ? 's' : ''} matching your criteria
        </p>
        
        {/* Search Mode Indicator */}
        <div className="mt-2 sm:mt-3 text-sm text-gray-500 dark:text-gray-400">
          {filters.q ? (
            <span>Searching by recipe name: <span className="font-semibold text-gray-700 dark:text-gray-300">{filters.q}</span></span>
          ) : filters.ingredients ? (
            <span>Searching by ingredients: <span className="font-semibold text-gray-700 dark:text-gray-300">{filters.ingredients.split(',').join(', ')}</span></span>
          ) : (
            <span>Showing all recipes</span>
          )}
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />

        {/* Results Section */}
        <div className="flex-1">
          {/* Did You Mean Suggestion */}
          {suggestion && totalResults === 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Did you mean:{' '}
                <button
                  onClick={() => {
                    if (suggestion.type === 'recipe') {
                      updateFilters({ ...filters, q: suggestion.text, ingredients: '', exclude: '' });
                    } else {
                      updateFilters({ ...filters, ingredients: suggestion.text, q: '', exclude: '' });
                    }
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {suggestion.text}
                </button>
                ?
              </p>
            </div>
          )}
          
          {/* Sort and View Options */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                value={filters.sort}
                onChange={(e) => updateFilters({ ...filters, sort: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="recent">Newest First</option>
                <option value="time">Cook Time</option>
                <option value="calories">Calories</option>
                <option value="rating">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Recipe Grid */}
          {loading ? (
            <LoadingGrid />
          ) : recipes.length === 0 ? (
            <EmptyState 
              onGenerateAI={openAIModal}
              hasSearchTerms={!!(filters.ingredients || filters.q)}
            />
          ) : (
            <>
              <RecipeGrid recipes={recipes} />
              
              {/* Subtle AI Option after results */}
              {(filters.ingredients || filters.q) && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Didn't find what you're looking for?
                  </p>
                  <button
                    onClick={openAIModal}
                    className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Try AI Recipe Generator
                  </button>
                </div>
              )}
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <AIGenerationModal
          loading={aiLoading}
          error={aiError}
          recipe={generatedRecipe}
          draft={aiDraft}
          setDraft={setAiDraft}
          credits={aiCredits}
          onClose={closeAIModal}
          onSubmit={submitAIGeneration}
          onFindRealRecipes={findRealRecipesLikeThis}
          onEdit={() => {
            setGeneratedRecipe(null);
            setAiError(null);
          }}
        />
      )}
    </div>
  );
};

// AI Generation Modal Component
const AIGenerationModal = ({ loading, error, recipe, draft, setDraft, credits, onClose, onSubmit, onFindRealRecipes, onEdit }) => {
  const addIngredient = (raw) => {
    const value = String(raw || '').trim().toLowerCase();
    if (!value) return;
    setDraft((prev) => {
      const nextIngredients = Array.from(new Set([...(prev.ingredients || []), value]));
      return { ...prev, ingredients: nextIngredients, ingredientInput: '' };
    });
  };

  const removeIngredient = (value) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((i) => i !== value),
    }));
  };

  const coverage = useMemo(() => {
    if (!recipe) return null;
    const picked = (draft.ingredients || []).map(s => String(s).toLowerCase());
    const usedNames = (recipe.ingredients || []).map(i => String(i?.name || '').toLowerCase()).filter(Boolean);
    const used = picked.filter(p => usedNames.some(n => n.includes(p) || p.includes(n)));
    const missing = picked.filter(p => !used.includes(p));
    const pct = picked.length ? Math.round((used.length / picked.length) * 100) : 0;
    return { pct, used, missing };
  }, [recipe, draft.ingredients]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="h-full w-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-hidden sm:max-w-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
              AI Recipe Generator
            </h2>
            {credits?.limit != null && credits?.remaining != null ? (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                Credits left today: <span className="font-semibold">{credits.remaining}</span> / {credits.limit}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                AI is creating your recipe...
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                This may take a few seconds
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!recipe && !loading && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Ingredients (edit before generating)
                </label>

                <IngredientSearchBar
                  inputId="ai-ingredient-search"
                  className="shadow-xl rounded-lg sm:rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  selectedValues={draft.ingredients || []}
                  chips={(draft.ingredients || []).map((ing) => (
                    <span
                      key={ing}
                      className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full shadow-sm bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100"
                    >
                      <span className="capitalize">{ing}</span>
                      <button
                        type="button"
                        onClick={() => removeIngredient(ing)}
                        className="font-bold leading-none opacity-80 hover:opacity-100"
                        aria-label={`Remove ${ing}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  inputValue={draft.ingredientInput}
                  setInputValue={(value) => setDraft((prev) => ({ ...prev, ingredientInput: value }))}
                  allSuggestions={AI_INGREDIENT_SUGGESTIONS}
                  onAdd={addIngredient}
                  placeholder={(draft.ingredients || []).length === 0 ? 'e.g., chicken, basil…' : ''}
                  actions={
                    <button
                      type="button"
                      onClick={() => addIngredient(draft.ingredientInput)}
                      className="font-bold py-2 px-4 rounded-xl transition duration-300 shadow-md flex-shrink-0 text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 w-full sm:w-auto"
                    >
                      Add
                    </button>
                  }
                />

                {(draft.ingredients || []).length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Tip: start with what you already have.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Recipe idea (optional)
                </label>
                <input
                  value={draft.dishIdea}
                  onChange={(e) => setDraft({ ...draft, dishIdea: e.target.value })}
                  placeholder="e.g., spicy chicken pasta"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This helps ReciFind style the recipe like a real menu item.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Extra instructions (optional)
                </label>
                <textarea
                  value={draft.extraInstructions}
                  onChange={(e) => setDraft({ ...draft, extraInstructions: e.target.value })}
                  placeholder="e.g., make it kid-friendly, no dairy, one-pan, extra crispy"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">What makes this ReciFind AI?</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  It tries to maximize ingredient match and then lets you jump back into real recipes with one tap.
                </div>
              </div>
            </div>
          )}

          {recipe && (
            <div>
              {coverage ? (
                <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Ingredient match</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{coverage.pct}%</div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div className="h-2 bg-green-600" style={{ width: `${coverage.pct}%` }} />
                  </div>
                  {coverage.missing.length > 0 ? (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                      Missing: {coverage.missing.slice(0, 6).join(', ')}
                      {coverage.missing.length > 6 ? '…' : ''}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Great match — it used everything you picked.</div>
                  )}
                </div>
              ) : null}

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {recipe.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {recipe.description}
              </p>

              {/* Recipe Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Prep</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.prep_time}m</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cook</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.cook_time}m</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Servings</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.servings}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.calories}</p>
                </div>
              </div>

              {/* Ingredients */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Ingredients</h4>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {ing.quantity} {ing.unit} {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Instructions</h4>
                <ol className="space-y-3">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 pt-0.5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  {recipe.difficulty}
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  {recipe.cuisine}
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-sm">
                  {recipe.spice_level}
                </span>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-700 dark:text-green-400 text-sm">
                  ✓ Recipe generated successfully! This recipe is for your reference and not saved to the database.
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => onFindRealRecipes(recipe)}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Find real recipes like this
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg"
                >
                  Edit inputs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95">
            {!recipe ? (
              <button
                onClick={onSubmit}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
                disabled={loading}
              >
                Generate recipe
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

// Filter Sidebar Component
const FilterSidebar = ({ filters, updateFilters, clearFilters, activeFilterCount, showFilters, setShowFilters }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    updateFilters(localFilters);
    setShowFilters(false);
  };

  const cuisines = ['Italian', 'Chinese', 'American', 'Thai', 'Asian'];
  const difficulties = ['easy', 'medium', 'hard'];
  const spiceLevels = ['mild', 'medium', 'hot'];

  return (
    <div className={`
      lg:w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-fit
      ${showFilters ? 'block' : 'hidden lg:block'}
      lg:sticky lg:top-24
    `}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Text Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            value={localFilters.q}
            onChange={(e) => setLocalFilters({ ...localFilters, q: e.target.value })}
            placeholder="Recipe name or description"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Include Ingredients
          </label>
          <input
            type="text"
            value={localFilters.ingredients}
            onChange={(e) => setLocalFilters({ ...localFilters, ingredients: e.target.value })}
            placeholder="e.g., chicken, garlic"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate with commas</p>
        </div>

        {/* Exclude Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Exclude Ingredients
          </label>
          <input
            type="text"
            value={localFilters.exclude}
            onChange={(e) => setLocalFilters({ ...localFilters, exclude: e.target.value })}
            placeholder="e.g., nuts, dairy"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For allergies</p>
        </div>

        {/* Cuisine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cuisine
          </label>
          <select
            value={localFilters.cuisine}
            onChange={(e) => setLocalFilters({ ...localFilters, cuisine: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Cuisines</option>
            {cuisines.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty
          </label>
          <select
            value={localFilters.difficulty}
            onChange={(e) => setLocalFilters({ ...localFilters, difficulty: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Levels</option>
            {difficulties.map(d => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Max Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Cook Time (minutes)
          </label>
          <input
            type="number"
            value={localFilters.maxTime}
            onChange={(e) => setLocalFilters({ ...localFilters, maxTime: e.target.value })}
            placeholder="e.g., 30"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Calorie Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Calorie Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={localFilters.minCalories}
              onChange={(e) => setLocalFilters({ ...localFilters, minCalories: e.target.value })}
              placeholder="Min"
              className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              value={localFilters.maxCalories}
              onChange={(e) => setLocalFilters({ ...localFilters, maxCalories: e.target.value })}
              placeholder="Max"
              className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Spice Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Spice Level
          </label>
          <select
            value={localFilters.spice}
            onChange={(e) => setLocalFilters({ ...localFilters, spice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Levels</option>
            {spiceLevels.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApply}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

// Recipe Grid Component
const RecipeGrid = ({ recipes }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
};

// Recipe Card Component
const RecipeCard = ({ recipe }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  return (
    <Link to={`/recipe/${recipe.id}`} className="group">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="relative h-48 overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse" />
          )}
          <img
            src={resolveImageUrl(recipe.image_url) || 'https://via.placeholder.com/400x300?text=Recipe'}
            alt={recipe.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
            {recipe.difficulty}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400">
            {recipe.title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {recipe.description}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{recipe.total_time || (recipe.prep_time + recipe.cook_time)} min</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>{recipe.calories} cal</span>
            </div>
          </div>
          
          {recipe.cuisine && (
            <div className="mt-2">
              <span className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">
                {recipe.cuisine}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

// Loading Grid
const LoadingGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
          <div className="p-4">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-3 w-2/3"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Empty State
const EmptyState = ({ onGenerateAI, hasSearchTerms }) => {
  return (
    <div className="text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        No recipes found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Try adjusting your filters or search terms
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Link to="/" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300">
          Back to Home
        </Link>
        {hasSearchTerms && (
          <button
            onClick={onGenerateAI}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate with AI
          </button>
        )}
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxPagesToShow = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        Previous
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            1
          </button>
          {startPage > 2 && <span className="text-gray-500">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 border rounded-lg transition ${
            currentPage === page
              ? 'bg-green-600 text-white border-green-600'
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {page}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        Next
      </button>
    </div>
  );
};

export default SearchPage;
