import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import IngredientSearchBar from '../components/Common/IngredientSearchBar';
import { resolveImageUrl } from '../utils/resolveImageUrl';

// --- MOCK DATA ---
const mockIngredients = ['Beef', 'Cheese', 'Eggs', 'Potatoes', 'Veggies'];
const allAutofillSuggestions = [
  'Chicken', 'Garlic', 'Basil', 'Tomato', 'Onion', 
  'Salt', 'Pepper', 'Milk', 'Bread', 'Flour', 
  'Sugar', 'Butter', 'Rice', 'Pasta', 'Olive Oil'
];

const mockRecipes = [
  {
    id: 1,
    title: "Spicy Beef Tacos",
    description: "Tender beef with a kick of chipotle. Uses: Ground Beef, Tortillas, Chili.",
    match: 90,
    time: "35 mins",
    imageUrl: "https://placehold.co/600x400/87CEEB/ffffff?text=Spicy+Taco",
    rating: 4.5,
    reviews: 88
  },
  {
    id: 2,
    title: "Creamy Lemon Pasta",
    description: "A light and zesty vegetarian classic. Uses: Pasta, Lemon, Cream, Parmesan.",
    match: 95,
    time: "20 mins",
    imageUrl: "https://placehold.co/600x400/FFA07A/ffffff?text=Lemon+Pasta",
    rating: 4.9,
    reviews: 451
  },
  {
    id: 3,
    title: "Coconut Chicken Curry",
    description: "Rich and aromatic, ready in one pot. Uses: Chicken, Coconut Milk, Curry Paste.",
    match: 85,
    time: "45 mins",
    imageUrl: "https://placehold.co/600x400/90EE90/ffffff?text=Chicken+Curry",
    rating: 4.2,
    reviews: 198
  },
  {
    id: 4,
    title: "Flourless Chocolate Cake",
    description: "Decadent dessert for chocolate lovers. Uses: Chocolate, Butter, Eggs, Sugar.",
    match: 100,
    time: "60 mins",
    imageUrl: "https://placehold.co/600x400/ADD8E6/ffffff?text=Chocolate+Cake",
    rating: 5.0,
    reviews: 34
  },
];

const StarIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.487 7.545l6.561-.955L10 1l2.952 5.59L19.513 7.545l-4.758 4.04 1.123 6.545z"/>
  </svg>
);

const IngredientPill = React.memo(({ ingredient, mode, onToggleMode }) => {
  let classes = "";
  let icon = "";
  let ariaLabel = "";

  if (mode === 'include') {
    classes = "bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100";
    icon = "+";
    ariaLabel = `Toggle ${ingredient} to exclude`;
  } else {
    classes = "bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100 border border-red-300 dark:border-red-600 line-through opacity-80";
    icon = "−";
    ariaLabel = `Toggle ${ingredient} to remove`;
  }

  return (
    <button 
      onClick={() => onToggleMode(ingredient)}
      className={`ingredient-tag flex items-center text-sm font-medium px-3 py-1 rounded-full shadow-sm transition duration-150 hover:scale-105 ${classes}`}
      aria-label={ariaLabel}
    >
      <span className="font-bold mr-2 leading-none">{icon}</span>
      <span>{ingredient}</span>
    </button>
  );
});

const RecipeCard = React.memo(({ recipe, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = resolveImageUrl(recipe.image_url) || recipe.imageUrl || 'https://placehold.co/600x400/87CEEB/ffffff?text=Recipe';
  const likeCount = recipe.like_count || recipe.likes || 0;
  
  return (
    <div 
      onClick={onClick}
      className="recipe-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
    >
      <div className="relative h-48">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse" />
        )}
        <img 
          src={imageUrl} 
          alt={recipe.title} 
          className={`w-full h-48 object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{recipe.title}</h3>
        
        {recipe.chef_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">by {recipe.chef_name}</p>
        )}
        
        {likeCount > 0 && (
          <div className="flex items-center text-yellow-500 mb-2">
            <StarIcon />
            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400 font-semibold">
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </span>
          </div>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {recipe.description}
        </p>
        
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 text-sm">
          {recipe.difficulty && (
            <span className="capitalize font-medium">{recipe.difficulty}</span>
          )}
          {totalTime > 0 && (
            <span>{totalTime} mins</span>
          )}
        </div>
      </div>
    </div>
  );
});

const HomePage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [activeIngredients, setActiveIngredients] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('ingredients'); // 'ingredients' or 'name'
  
  // State for recipe sections
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [popularRecipes, setPopularRecipes] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [featuredImageLoaded, setFeaturedImageLoaded] = useState(false);

  // Fetch recipes on mount
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        setFeaturedImageLoaded(false);
        
        // Fetch all three sections
        const [featuredRes, popularRes, recentRes] = await Promise.all([
          api.get('/api/recipes/featured').catch(() => null),
          api.get('/api/recipes/popular', { params: { limit: 8 } }).catch(() => ({ data: [] })),
          api.get('/api/recipes/recent', { params: { limit: 8 } }).catch(() => ({ data: [] }))
        ]);
        
        if (featuredRes?.data) {
          setFeaturedRecipe(featuredRes.data);
        }
        
        setPopularRecipes(popularRes.data || []);
        setRecentRecipes(recentRes.data || []);
      } catch (err) {
        console.error('Error fetching recipes:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipes();
  }, []);

  // Memoized filtered recipes for performance
  const filteredRecipes = useMemo(() => {
    switch (activeFilter) {
      case 'quick-easy':
        return popularRecipes.filter(recipe => {
          const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
          return recipe.difficulty === 'easy' && totalTime <= 30;
        });
      case 'high-protein':
        return popularRecipes.filter(recipe => 
          recipe.title.toLowerCase().includes('chicken') || 
          recipe.title.toLowerCase().includes('beef') || 
          recipe.title.toLowerCase().includes('fish') ||
          recipe.title.toLowerCase().includes('egg') ||
          recipe.title.toLowerCase().includes('protein')
        );
      case 'vegetarian':
        return popularRecipes.filter(recipe => 
          !recipe.title.toLowerCase().includes('chicken') && 
          !recipe.title.toLowerCase().includes('beef') && 
          !recipe.title.toLowerCase().includes('pork') &&
          !recipe.title.toLowerCase().includes('fish') &&
          !recipe.title.toLowerCase().includes('meat')
        );
      case 'desserts':
        return popularRecipes.filter(recipe => 
          recipe.title.toLowerCase().includes('cake') || 
          recipe.title.toLowerCase().includes('cookie') || 
          recipe.title.toLowerCase().includes('pie') ||
          recipe.title.toLowerCase().includes('chocolate') ||
          recipe.title.toLowerCase().includes('ice cream') ||
          recipe.title.toLowerCase().includes('pudding')
        );
      default:
        return popularRecipes;
    }
  }, [activeFilter, popularRecipes]);

  const toggleIngredientMode = useCallback((ingredient) => {
    setActiveIngredients(prevIngredients => {
      const newIngredients = new Map(prevIngredients);
      
      if (newIngredients.has(ingredient)) {
        const currentMode = newIngredients.get(ingredient);
        if (currentMode === 'include') {
          newIngredients.set(ingredient, 'exclude');
        } else {
          newIngredients.delete(ingredient);
        }
      }
      return newIngredients;
    });
  }, []);

  const handleAddIngredient = useCallback((ingredient) => {
    const titleCasedIngredient = ingredient.charAt(0).toUpperCase() + ingredient.slice(1).toLowerCase();
    setActiveIngredients(prevIngredients => {
      const newIngredients = new Map(prevIngredients);
      if (!newIngredients.has(titleCasedIngredient)) {
        newIngredients.set(titleCasedIngredient, 'include');
      }
      return newIngredients;
    });
    setSearchTerm('');
  }, []);

  const isIngredientActive = (ingredient) => activeIngredients.has(ingredient);

  const handleSearch = () => {
    // Build search params
    const params = new URLSearchParams();
    
    if (searchMode === 'name') {
      // Search by recipe name
      if (searchTerm.trim()) {
        params.append('q', searchTerm.trim());
        navigate(`/search?${params.toString()}`);
      } else {
        navigate('/search');
      }
    } else {
      // Search by ingredients (original logic)
      const includedIngredients = [];
      const excludedIngredients = [];
      
      activeIngredients.forEach((mode, ingredient) => {
        if (mode === 'include') {
          includedIngredients.push(ingredient.toLowerCase());
        } else if (mode === 'exclude') {
          excludedIngredients.push(ingredient.toLowerCase());
        }
      });
      
      if (includedIngredients.length > 0) {
        params.append('ingredients', includedIngredients.join(','));
      }
      
      if (excludedIngredients.length > 0) {
        params.append('exclude', excludedIngredients.join(','));
      }
      
      // Navigate to search page with params
      if (includedIngredients.length > 0 || excludedIngredients.length > 0) {
        navigate(`/search?${params.toString()}`);
      } else {
        navigate('/search');
      }
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setSearchTerm('');
    }
  };

  const getQuickToggleClasses = (ingredient) => {
    const baseClasses = "px-3 sm:px-4 py-2 rounded-full border transition duration-150 shadow-sm flex items-center touch-manipulation active:scale-95";
    const mode = activeIngredients.get(ingredient);

    if (mode === 'include') {
      return `bg-green-600 text-white border-green-600 hover:bg-green-700 active:bg-green-800 ${baseClasses}`;
    }
    if (mode === 'exclude') {
      return `bg-red-500 text-white border-red-500 hover:bg-red-600 active:bg-red-700 ${baseClasses} opacity-80 line-through`;
    }
    return `text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 ${baseClasses}`;
  };

  const mockNextIngredient = 'Basil';
  const showMockNextIngredient = !isIngredientActive(mockNextIngredient);

  return (
    <main className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-4 sm:py-6 lg:py-10">
      {/* Hero Section */}
      <section className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-gray-900 dark:text-gray-100 text-center mb-3 sm:mb-4 px-2">
          What's Cooking Today?
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 text-center mb-6 sm:mb-8 px-2">
          Find recipes based on the ingredients you already have.
        </p>

        {/* Search Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <button
              onClick={() => setSearchMode('ingredients')}
              className={`${searchMode === 'ingredients' ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'hover:text-gray-900 dark:hover:text-gray-200'} transition`}
            >
              Search by Ingredients
            </button>
            <span className="mx-2">|</span>
            <button
              onClick={() => setSearchMode('name')}
              className={`${searchMode === 'name' ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'hover:text-gray-900 dark:hover:text-gray-200'} transition`}
            >
              Search by Recipe Name
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:max-w-3xl sm:mx-auto mb-6 sm:mb-8">
          {searchMode === 'ingredients' ? (
            <IngredientSearchBar
              inputId="recipe-search"
              className="shadow-xl rounded-lg sm:rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              selectedValues={Array.from(activeIngredients.keys())}
              chips={Array.from(activeIngredients).map(([ingredient, mode]) => (
                <IngredientPill
                  key={ingredient}
                  ingredient={ingredient}
                  mode={mode}
                  onToggleMode={toggleIngredientMode}
                />
              ))}
              inputValue={searchTerm}
              setInputValue={setSearchTerm}
              allSuggestions={allAutofillSuggestions}
              onAdd={handleAddIngredient}
              onEnterWhenEmpty={() => {
                if (activeIngredients.size > 0) handleSearch();
              }}
              placeholder={activeIngredients.size === 0 ? 'e.g., chicken, basil...' : ''}
              actions={
                <>
                  {showMockNextIngredient && !searchTerm ? (
                    <button
                      type="button"
                      onClick={() => handleAddIngredient(mockNextIngredient)}
                      className="hidden sm:flex items-center text-sm px-3 py-2 rounded-xl transition duration-150 border font-medium text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-90 whitespace-nowrap flex-shrink-0"
                    >
                      <span className="mr-1 text-xs">Suggest: {mockNextIngredient}</span>
                      <span className="font-bold text-base leading-none">+</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="font-bold py-2 px-4 sm:px-6 rounded-xl transition duration-300 shadow-md flex-shrink-0 text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 w-full sm:w-auto"
                  >
                    Search
                  </button>
                </>
              }
            />
          ) : (
            <div className="relative w-full shadow-xl rounded-lg sm:rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center p-2 gap-2">
                <div className="flex items-center flex-1 min-w-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mx-2 sm:mx-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>

                  <input
                    type="text"
                    id="recipe-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="flex-grow min-w-[120px] py-2 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none text-base sm:text-lg"
                    placeholder="e.g., Chicken Curry, Pasta..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  className="font-bold py-2 px-4 sm:px-6 rounded-xl transition duration-300 shadow-md flex-shrink-0 text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 w-full sm:w-auto"
                >
                  Search
                </button>
              </div>
            </div>
          )}
          
          {/* Subtle AI Option */}
          {(activeIngredients.size > 0 || (searchMode === 'name' && searchTerm.trim())) && (
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  // Navigate to search page with AI generation flag
                  const params = new URLSearchParams();
                  if (searchMode === 'name' && searchTerm.trim()) {
                    params.append('q', searchTerm.trim());
                  } else {
                    const includedIngredients = [];
                    activeIngredients.forEach((mode, ingredient) => {
                      if (mode === 'include') {
                        includedIngredients.push(ingredient.toLowerCase());
                      }
                    });
                    if (includedIngredients.length > 0) {
                      params.append('ingredients', includedIngredients.join(','));
                    }
                  }
                  params.append('ai', '1');
                  navigate(`/search?${params.toString()}`);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>or generate with AI</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Quick Toggle Buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full sm:max-w-4xl sm:mx-auto mb-6 sm:mb-8 lg:mb-12">
          {mockIngredients.map(ingredient => (
            <button 
              key={ingredient}
              onClick={() => isIngredientActive(ingredient) ? toggleIngredientMode(ingredient) : handleAddIngredient(ingredient)}
              className={getQuickToggleClasses(ingredient)}
            >
              <span className="mr-1 sm:mr-2 text-lg">
                {ingredient === 'Beef' && '🥩'}
                {ingredient === 'Cheese' && '🧀'}
                {ingredient === 'Eggs' && '🥚'}
                {ingredient === 'Potatoes' && '🥔'}
                {ingredient === 'Veggies' && '🥦'}
              </span> 
              <span className="text-sm sm:text-base">{ingredient}</span>
            </button>
          ))}
        </div>

        {/* Featured Recipe Section */}
        {featuredRecipe && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 lg:p-12 border-b-4 border-orange-500">
            <div className="lg:flex lg:space-x-12 items-center">
              <div className="lg:w-1/3 mb-4 sm:mb-6 lg:mb-0 relative">
                <div className="relative">
                  {!featuredImageLoaded && (
                    <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse rounded-xl sm:rounded-2xl" style={{ aspectRatio: '4/3' }} />
                  )}
                  <img 
                    src={resolveImageUrl(featuredRecipe.image_url) || 'https://placehold.co/800x600/FF6347/ffffff?text=Featured+Recipe'} 
                    alt={featuredRecipe.title} 
                    className={`w-full h-auto object-cover rounded-xl sm:rounded-2xl shadow-xl transition-opacity duration-300 ${featuredImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setFeaturedImageLoaded(true)}
                  />
                </div>
                <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-full uppercase">
                  Today's Pick
                </span>
              </div>
              <div className="lg:w-2/3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">
                  {featuredRecipe.title}
                </h2>
                {featuredRecipe.chef_name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    by Chef {featuredRecipe.chef_name}
                  </p>
                )}
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 leading-relaxed">
                  {featuredRecipe.description}
                </p>
                <ul className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  {(featuredRecipe.prep_time || featuredRecipe.cook_time) && (
                    <li className="flex items-center">
                      <span className="font-bold mr-1">Time:</span> {(featuredRecipe.prep_time || 0) + (featuredRecipe.cook_time || 0)} mins
                    </li>
                  )}
                  {featuredRecipe.servings && (
                    <li className="flex items-center">
                      <span className="font-bold mr-1">Servings:</span> {featuredRecipe.servings}
                    </li>
                  )}
                  {featuredRecipe.difficulty && (
                    <li className="flex items-center">
                      <span className="font-bold mr-1">Difficulty:</span> {featuredRecipe.difficulty}
                    </li>
                  )}
                </ul>
                <button 
                  onClick={() => navigate(`/recipe/${featuredRecipe.id}`)}
                  className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 sm:px-8 rounded-xl transition duration-300 text-base sm:text-lg shadow-lg w-full sm:w-auto touch-manipulation"
                >
                  View Full Recipe
                </button>
              </div>
            </div>
          </div>
        )}
        
        {loading && !featuredRecipe && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 lg:p-12 animate-pulse">
            <div className="lg:flex lg:space-x-12 items-center">
              <div className="lg:w-1/3 mb-4 sm:mb-6 lg:mb-0">
                <div className="bg-gray-300 dark:bg-gray-700 h-64 rounded-xl"></div>
              </div>
              <div className="lg:w-2/3 space-y-4">
                <div className="bg-gray-300 dark:bg-gray-700 h-8 w-3/4 rounded"></div>
                <div className="bg-gray-300 dark:bg-gray-700 h-4 w-full rounded"></div>
                <div className="bg-gray-300 dark:bg-gray-700 h-4 w-full rounded"></div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Popular Recipes Section with Filters */}
      <section className="py-8 sm:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8 border-b-2 border-blue-500 pb-2 inline-block">
          Popular Recipes
        </h2>

        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveFilter('all')}
            className={`font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            All Recipes
          </button>
          <button
            onClick={() => setActiveFilter('quick-easy')}
            className={`font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation ${
              activeFilter === 'quick-easy'
                ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            Quick & Easy
          </button>
          <button
            onClick={() => setActiveFilter('high-protein')}
            className={`font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation ${
              activeFilter === 'high-protein'
                ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            High Protein
          </button>
          <button
            onClick={() => setActiveFilter('vegetarian')}
            className={`font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation ${
              activeFilter === 'vegetarian'
                ? 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            Vegetarian
          </button>
          <button
            onClick={() => setActiveFilter('desserts')}
            className={`font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation ${
              activeFilter === 'desserts'
                ? 'bg-pink-600 text-white hover:bg-pink-700 active:bg-pink-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            Desserts
          </button>
        </div>

        {loading && filteredRecipes.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="bg-gray-300 dark:bg-gray-700 h-48"></div>
                <div className="p-5 space-y-3">
                  <div className="bg-gray-300 dark:bg-gray-700 h-6 w-3/4 rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-700 h-4 w-full rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-700 h-4 w-2/3 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredRecipes.slice(0, 8).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => navigate(`/recipe/${recipe.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No recipes found for this filter. Try a different category.
          </p>
        )}
      </section>

      {/* Recent Recipes Section */}
      <section className="py-8 sm:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8 border-b-2 border-purple-500 pb-2 inline-block">
          Recent Recipes
        </h2>

        {loading && recentRecipes.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="bg-gray-300 dark:bg-gray-700 h-48"></div>
                <div className="p-5 space-y-3">
                  <div className="bg-gray-300 dark:bg-gray-700 h-6 w-3/4 rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-700 h-4 w-full rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-700 h-4 w-2/3 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {recentRecipes.slice(0, 8).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => navigate(`/recipe/${recipe.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent recipes found.</p>
        )}
      </section>
    </main>
  );
};

export default HomePage;
