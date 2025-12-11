import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ChefDashboard() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchChefRecipes();
  }, []);

  const fetchChefRecipes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/recipes/my');
      setRecipes(response.data);
      setError('');
    } catch (err) {
      setError('Error loading recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = filter === 'all' 
    ? recipes 
    : recipes.filter(r => r.status === filter);

  const stats = {
    total: recipes.length,
    approved: recipes.filter(r => r.status === 'approved').length,
    pending: recipes.filter(r => r.status === 'pending').length,
    rejected: recipes.filter(r => r.status === 'rejected').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Chef Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your recipes and track their status
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Recipes</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded ${
              filter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded ${
              filter === 'rejected'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Create Recipe Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/chef/recipe/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Create Recipe
          </button>
        </div>

        {/* Recipes List */}
        {filteredRecipes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No recipes yet. Start by creating your first recipe!
            </p>
            <button
              onClick={() => navigate('/chef/recipe/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Create Recipe
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Likes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecipes.map(recipe => (
                  <tr key={recipe.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {recipe.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(recipe.status)}`}>
                        {recipe.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {recipe.likes_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(recipe.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-4"
                      >
                        View
                      </button>
                      {(recipe.status === 'pending' || recipe.status === 'rejected') && (
                        <button
                          onClick={() => navigate(`/chef/recipe/edit/${recipe.id}`)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChefDashboard;
