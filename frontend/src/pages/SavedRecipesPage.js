import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';
import Toast from '../components/Common/Toast';
import { resolveImageUrl } from '../utils/resolveImageUrl';

export default function SavedRecipesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savedCollectionId, setSavedCollectionId] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const colRes = await api.get('/api/collections/my');
        const list = colRes.data?.collections || [];
        const saved = list.find((c) => String(c.name || '').toLowerCase() === 'saved');
        if (!saved?.id) {
          setSavedCollectionId(null);
          setItems([]);
          return;
        }
        setSavedCollectionId(saved.id);

        const itemsRes = await api.get(`/api/collections/${saved.id}/items`);
        setItems(itemsRes.data?.items || []);
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to load saved recipes', 'error');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleRemove = async (itemId) => {
    if (!savedCollectionId) return;
    const id = parseInt(itemId, 10);
    if (!Number.isFinite(id)) return;

    try {
      await api.delete(`/api/collections/${savedCollectionId}/items/${id}`);
      setItems((prev) => (prev || []).filter((i) => i.item_id !== id));
      showToast('Removed from saved', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove item', 'error');
    }
  };

  return (
    <main className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8 lg:py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Saved Recipes</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading saved recipes…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-gray-600 dark:text-gray-400">No saved recipes yet. Click “Save” on any recipe.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const title = item.recipe_id
                ? (item.recipe_title || `Recipe #${item.recipe_id}`)
                : (item.ai_recipe?.title || 'AI Recipe');
              const imageUrl = item.recipe_id ? resolveImageUrl(item.recipe_image_url) : null;

              return (
                <div key={item.item_id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <div className="h-32 bg-gray-100 dark:bg-gray-700/40">
                    {imageUrl ? (
                      <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                        {item.recipe_id ? 'No image' : 'AI'}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.recipe_id ? 'Recipe' : 'AI recipe'}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.recipe_id) navigate(`/recipe/${item.recipe_id}`);
                          else navigate(`/ai/${item.item_id}`);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRemove(item.item_id)}
                        className="ml-auto px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />
    </main>
  );
}
