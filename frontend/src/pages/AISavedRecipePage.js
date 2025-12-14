import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function AISavedRecipePage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/api/collections/ai/${itemId}`);
        setRecipe(res.data?.aiRecipe || null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load AI recipe');
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [itemId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="w-full px-3 sm:px-4 lg:max-w-5xl lg:mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="w-full px-3 sm:px-4 lg:max-w-5xl lg:mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
      <div className="w-full px-3 sm:px-4 lg:max-w-5xl lg:mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recipe.title || 'AI Recipe'}</h1>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
            >
              Back
            </button>
          </div>

          {recipe.description ? (
            <p className="mt-3 text-gray-600 dark:text-gray-300">{recipe.description}</p>
          ) : null}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recipe.prep_time != null ? (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Prep</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.prep_time}m</p>
              </div>
            ) : null}
            {recipe.cook_time != null ? (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Cook</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.cook_time}m</p>
              </div>
            ) : null}
            {recipe.servings != null ? (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Servings</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.servings}</p>
              </div>
            ) : null}
            {recipe.calories != null ? (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{recipe.calories}</p>
              </div>
            ) : null}
          </div>

          {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Ingredients</h2>
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
          ) : null}

          {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Instructions</h2>
              <ol className="space-y-3">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
