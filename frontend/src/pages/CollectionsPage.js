import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';
import Toast from '../components/Common/Toast';
import { resolveImageUrl } from '../utils/resolveImageUrl';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [loadingCollections, setLoadingCollections] = useState(true);
  const [collections, setCollections] = useState([]);

  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(false);

  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [activeItems, setActiveItems] = useState([]);
  const [loadingActiveItems, setLoadingActiveItems] = useState(false);

  const [editCollectionName, setEditCollectionName] = useState('');
  const [editCollectionPublic, setEditCollectionPublic] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [deletingCollection, setDeletingCollection] = useState(false);

  const refreshCollections = async () => {
    const colRes = await api.get('/api/collections/my');
    setCollections(colRes.data?.collections || []);
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoadingCollections(true);
        await refreshCollections();
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to load collections', 'error');
        setCollections([]);
      } finally {
        setLoadingCollections(false);
      }
    };

    load();
  }, [user]);

  const openCollectionManager = async (collectionId) => {
    const id = parseInt(collectionId, 10);
    if (!Number.isFinite(id)) return;
    setActiveCollectionId(id);
    setLoadingActiveItems(true);
    try {
      const res = await api.get(`/api/collections/${id}/items`);
      setActiveCollection(res.data?.collection || null);
      setActiveItems(res.data?.items || []);
      setEditCollectionName(String(res.data?.collection?.name || ''));
      setEditCollectionPublic(Boolean(res.data?.collection?.is_public));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load collection', 'error');
      setActiveCollection(null);
      setActiveItems([]);
    } finally {
      setLoadingActiveItems(false);
    }
  };

  const closeCollectionManager = () => {
    setActiveCollectionId(null);
    setActiveCollection(null);
    setActiveItems([]);
    setEditCollectionName('');
    setEditCollectionPublic(false);
  };

  const handleRemoveActiveItem = async (itemId) => {
    if (!user || !activeCollectionId) return;
    const id = parseInt(itemId, 10);
    if (!Number.isFinite(id)) return;
    try {
      await api.delete(`/api/collections/${activeCollectionId}/items/${id}`);
      setActiveItems((prev) => (prev || []).filter((i) => i.item_id !== id));
      showToast('Removed from collection', 'success');
      await refreshCollections();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove item', 'error');
    }
  };

  const handleSaveCollectionSettings = async () => {
    if (!user || !activeCollectionId) return;
    const name = String(editCollectionName || '').trim();
    if (!name) {
      showToast('Collection name is required', 'error');
      return;
    }
    try {
      setSavingCollection(true);
      const res = await api.patch(`/api/collections/${activeCollectionId}`, {
        name,
        isPublic: editCollectionPublic,
      });
      setActiveCollection(res.data?.collection || activeCollection);
      showToast('Collection updated', 'success');
      await refreshCollections();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update collection', 'error');
    } finally {
      setSavingCollection(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!user || !activeCollectionId) return;
    if (!window.confirm('Delete this collection? This cannot be undone.')) return;
    try {
      setDeletingCollection(true);
      await api.delete(`/api/collections/${activeCollectionId}`);
      showToast('Collection deleted', 'success');
      await refreshCollections();
      closeCollectionManager();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete collection', 'error');
    } finally {
      setDeletingCollection(false);
    }
  };

  const handleCreateCollection = async () => {
    const name = String(newCollectionName || '').trim();
    if (!name) {
      showToast('Collection name is required', 'error');
      return;
    }

    try {
      await api.post('/api/collections', { name, isPublic: newCollectionPublic });
      setNewCollectionName('');
      setNewCollectionPublic(false);
      showToast('Collection created', 'success');
      await refreshCollections();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create collection', 'error');
    }
  };

  const visibleCollections = (collections || []).filter((c) => String(c.name || '').toLowerCase() !== 'saved');

  return (
    <main className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8 lg:py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Collections</h1>
          <div className="flex items-center gap-2">
            {user?.id ? (
              <button
                onClick={() => navigate(`/profile/${user.id}`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                View profile
              </button>
            ) : null}
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>

        <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection name"
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newCollectionPublic}
                onChange={(e) => setNewCollectionPublic(e.target.checked)}
              />
              Public (visible on profile)
            </label>
            <button
              onClick={handleCreateCollection}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              Create
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {loadingCollections ? (
              <p className="text-gray-600 dark:text-gray-400">Loading collections…</p>
            ) : visibleCollections.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No collections yet. Create one above.</p>
            ) : (
              visibleCollections.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {c.is_public ? 'Public' : 'Private'} · {c.item_count} item{String(c.item_count) === '1' ? '' : 's'}
                    </div>
                  </div>
                  <button
                    onClick={() => openCollectionManager(c.id)}
                    className="shrink-0 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  >
                    Manage
                  </button>
                </div>
              ))
            )}

            {activeCollectionId ? (
              <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      Manage: {activeCollection?.name || `Collection #${activeCollectionId}`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Edit name/privacy, delete, or remove items.</div>
                  </div>
                  <button
                    onClick={closeCollectionManager}
                    className="shrink-0 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>

                {loadingActiveItems ? (
                  <p className="mt-3 text-gray-600 dark:text-gray-400">Loading collection…</p>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="collection-manager-name"
                          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Name
                        </label>
                        <input
                          id="collection-manager-name"
                          value={editCollectionName}
                          onChange={(e) => setEditCollectionName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={editCollectionPublic}
                            onChange={(e) => setEditCollectionPublic(e.target.checked)}
                          />
                          Public (visible on profile)
                        </label>
                        <button
                          onClick={handleSaveCollectionSettings}
                          disabled={savingCollection}
                          className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Items</h3>
                      <button
                        onClick={handleDeleteCollection}
                        disabled={deletingCollection}
                        className="px-3 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 text-sm"
                      >
                        Delete collection
                      </button>
                    </div>

                    {activeItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No items in this collection yet.</p>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeItems.map((item) => {
                          const title = item.recipe_id ? (item.recipe_title || `Recipe #${item.recipe_id}`) : (item.ai_recipe?.title || 'AI Recipe');
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
                                    onClick={() => handleRemoveActiveItem(item.item_id)}
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
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />
    </main>
  );
}
