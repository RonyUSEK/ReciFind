import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestion, setSuggestion] = useState(null); // For "Did you mean" feature
  
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
  }, [searchParams]);

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

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'recent').length;

  return (
    <div className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Search Recipes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Found {totalResults} recipe{totalResults !== 1 ? 's' : ''} matching your criteria
        </p>
        
        {/* Search Mode Indicator */}
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
            <EmptyState />
          ) : (
            <>
              <RecipeGrid recipes={recipes} />
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
            src={recipe.image_url || 'https://via.placeholder.com/400x300?text=Recipe'}
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
const EmptyState = () => {
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
      <Link to="/" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300">
        Back to Home
      </Link>
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
