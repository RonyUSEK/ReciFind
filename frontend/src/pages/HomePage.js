import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

const RecipeCard = React.memo(({ recipe }) => (
  <div className="recipe-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-48 object-cover" />
    <div className="p-5">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{recipe.title}</h3>
      
      <div className="flex items-center text-yellow-500 mb-2">
        <StarIcon />
        <span className="ml-1 text-sm text-gray-600 dark:text-gray-400 font-semibold">
          {recipe.rating} ({recipe.reviews} Reviews)
        </span>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{recipe.description}</p>
      
      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 text-sm">
        <span><span className="font-bold text-green-600">{recipe.match}%</span> Match</span>
        <span>{recipe.time}</span>
      </div>
    </div>
  </div>
));

const HomePage = ({ theme, toggleTheme }) => {
  const [activeIngredients, setActiveIngredients] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

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
    setSelectedSuggestionIndex(-1);
  }, []);

  const isIngredientActive = (ingredient) => activeIngredients.has(ingredient);

  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedSuggestionIndex >= 0) {
      const element = document.querySelector(`[data-suggestion-index="${selectedSuggestionIndex}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedSuggestionIndex]);

  const handleSearch = () => {
    if (activeIngredients.size > 0) {
      alert(`Searching for recipes with: ${Array.from(activeIngredients.keys()).join(', ')}`);
    } else {
      alert('Please select at least one ingredient to search.');
    }
  };

  const handleKeyDown = (e) => {
    const suggestions = [
      ...(searchTerm.trim().length > 0 && !isIngredientActive(searchTerm.trim()) ? [searchTerm.trim()] : []),
      ...filteredSuggestions
    ];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        handleAddIngredient(suggestions[selectedSuggestionIndex]);
      } else if (searchTerm.trim().length > 0) {
        handleAddIngredient(searchTerm.trim());
      } else if (activeIngredients.size > 0) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setSearchTerm('');
      setSelectedSuggestionIndex(-1);
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

  const filteredSuggestions = allAutofillSuggestions.filter(item => 
    item.toLowerCase().includes(searchTerm.toLowerCase()) && !isIngredientActive(item)
  ).slice(0, 5);

  const mockNextIngredient = 'Basil';
  const showMockNextIngredient = !isIngredientActive(mockNextIngredient);

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Hero Section */}
      <section className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-gray-900 dark:text-gray-100 text-center mb-3 sm:mb-4 px-2">
          What's Cooking Today?
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 text-center mb-6 sm:mb-8 px-2">
          Find recipes based on the ingredients you already have.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-3xl mx-auto shadow-xl rounded-2xl bg-white dark:bg-gray-800 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center p-2 gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mx-2 sm:mx-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              <div className="flex flex-wrap items-center flex-grow py-1 gap-2 min-w-0">
                {Array.from(activeIngredients).map(([ingredient, mode]) => (
                  <IngredientPill 
                    key={ingredient}
                    ingredient={ingredient} 
                    mode={mode} 
                    onToggleMode={toggleIngredientMode}
                  />
                ))}
                
                <input 
                  type="text" 
                  id="recipe-search" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-grow min-w-[120px] py-2 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none text-base sm:text-lg" 
                  placeholder={activeIngredients.size === 0 ? "e.g., chicken, basil..." : ""}
                />
              </div>
            </div>
            
            {showMockNextIngredient && !searchTerm && (
              <button
                onClick={() => handleAddIngredient(mockNextIngredient)}
                className="hidden sm:flex items-center text-sm px-3 py-2 rounded-xl transition duration-150 border font-medium text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-90 whitespace-nowrap flex-shrink-0"
              >
                <span className="mr-1 text-xs">Suggest: {mockNextIngredient}</span>
                <span className="font-bold text-base leading-none">+</span>
              </button>
            )}
            
            <button 
              onClick={handleSearch}
              className="font-bold py-2 px-4 sm:px-6 rounded-xl transition duration-300 shadow-md flex-shrink-0 text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 w-full sm:w-auto"
            >
              Search
            </button>
          </div>
          
          {/* Autofill Dropdown */}
          {searchTerm.length > 0 && (() => {
            const suggestions = [
              ...(searchTerm.trim().length > 0 && !isIngredientActive(searchTerm.trim()) ? [{ value: searchTerm.trim(), isCustom: true }] : []),
              ...filteredSuggestions.map(item => ({ value: item, isCustom: false }))
            ];

            return (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 z-20 max-h-[60vh] overflow-y-auto">
                <div className="p-3">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = index === selectedSuggestionIndex;
                    const isCustom = suggestion.isCustom;
                    
                    return (
                      <button
                        key={`${suggestion.value}-${index}`}
                        data-suggestion-index={index}
                        onClick={() => handleAddIngredient(suggestion.value)}
                        className={`w-full flex items-center justify-between text-base px-4 py-3 rounded-xl transition duration-150 font-medium mb-2 last:mb-0 ${
                          isCustom
                            ? `bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md ${isSelected ? 'ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-800' : ''}`
                            : `bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 ${isSelected ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-800 bg-gray-100 dark:bg-gray-600' : ''}`
                        }`}
                      >
                        <span className="truncate">
                          {isCustom ? `Add "${suggestion.value}"` : suggestion.value}
                        </span>
                        <span className={`font-bold text-lg leading-none ml-2 ${isCustom ? '' : 'text-green-600 dark:text-green-400'}`}>
                          +
                        </span>
                      </button>
                    );
                  })}

                  {suggestions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      Press Enter to add "{searchTerm.trim()}"
                    </p>
                  )}

                  {suggestions.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Use ↑↓ arrows to navigate, Enter to select, Esc to close
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* Quick Toggle Buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto mb-8 sm:mb-12">
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

        {/* Recipe of the Day */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 lg:p-12 border-b-4 border-orange-500">
          <div className="lg:flex lg:space-x-12 items-center">
            <div className="lg:w-1/3 mb-4 sm:mb-6 lg:mb-0 relative">
              <img src="https://placehold.co/800x600/FF6347/ffffff?text=Roasted+Salmon" alt="Recipe of the Day" className="w-full h-auto object-cover rounded-xl sm:rounded-2xl shadow-xl" />
              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-full uppercase">Today's Pick</span>
            </div>
            <div className="lg:w-2/3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">One-Pan Honey-Garlic Salmon</h2>
              <div className="flex items-center text-yellow-500 mb-3 sm:mb-4">
                <StarIcon /><StarIcon /><StarIcon /><StarIcon />
                <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 font-semibold">4.8 (1,230 Reviews)</span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 leading-relaxed">
                A quick, healthy, and incredibly flavorful dinner that's perfect for a busy weeknight. Ready in under 30 minutes, it uses simple pantry staples like honey, garlic, and soy sauce to create a delicious glaze.
              </p>
              <ul className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="font-bold mr-1">Time:</span> 25 mins
                </li>
                <li className="flex items-center">
                  <span className="font-bold mr-1">Servings:</span> 4
                </li>
                <li className="flex items-center">
                  <span className="font-bold mr-1">Difficulty:</span> Easy
                </li>
              </ul>
              <button className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 sm:px-8 rounded-xl transition duration-300 text-base sm:text-lg shadow-lg w-full sm:w-auto touch-manipulation">
                View Full Recipe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Recipes Section */}
      <section className="py-8 sm:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8 border-b-2 border-green-500 pb-2 inline-block">Recommended Recipes</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button className="bg-green-600 text-white font-semibold py-2 px-4 sm:px-5 rounded-full shadow-md whitespace-nowrap text-sm sm:text-base touch-manipulation active:bg-green-700">Quick & Easy</button>
          <button className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 py-2 px-4 sm:px-5 rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap text-sm sm:text-base touch-manipulation">High Protein</button>
          <button className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 py-2 px-4 sm:px-5 rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap text-sm sm:text-base touch-manipulation">Vegetarian</button>
          <button className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 py-2 px-4 sm:px-5 rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap text-sm sm:text-base touch-manipulation">Desserts</button>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {mockRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </section>
    </main>
  );
};

export default HomePage;
