import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ReportButton from '../components/Report/ReportButton';
import { resolveImageUrl } from '../utils/resolveImageUrl';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';
import Toast from '../components/Common/Toast';

const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const [isInSelectedCollection, setIsInSelectedCollection] = useState(false);
  const [checkingSelectedCollection, setCheckingSelectedCollection] = useState(false);

  const [newCollectionName, setNewCollectionName] = useState('');
  const [createCollectionLoading, setCreateCollectionLoading] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        setError(null);
        setImageLoaded(false);
        
        const response = await api.get(`/api/recipes/${id}`);
        setRecipe(response.data);
      } catch (err) {
        console.error('Error fetching recipe:', err);
        
        if (err.response?.status === 404) {
          setError('Recipe not found');
        } else {
          setError('Failed to load recipe. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  useEffect(() => {
    const fetchSaveAndCollections = async () => {
      if (!user || !recipe?.id) return;

      try {
        setCollectionsLoading(true);

        const [savedRes, collectionsRes] = await Promise.all([
          api.get('/api/collections/saved/status', { params: { recipeId: recipe.id } }),
          api.get('/api/collections/my'),
        ]);

        setIsSaved(Boolean(savedRes.data?.saved));
        const list = collectionsRes.data?.collections || [];
        setCollections(list);

        // Default selection: first non-Saved collection (if any)
        const first = list.find((c) => String(c.name || '').toLowerCase() !== 'saved');
        setSelectedCollectionId(first ? String(first.id) : '');
      } catch (err) {
        // Non-fatal
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchSaveAndCollections();
  }, [user, recipe?.id]);

  useEffect(() => {
    const checkSelectedCollection = async () => {
      if (!user || !recipe?.id) return;

      if (!selectedCollectionId || selectedCollectionId === '__new__') {
        setIsInSelectedCollection(false);
        return;
      }

      const collectionId = parseInt(selectedCollectionId, 10);
      if (!Number.isFinite(collectionId)) {
        setIsInSelectedCollection(false);
        return;
      }

      try {
        setCheckingSelectedCollection(true);
        const res = await api.get(`/api/collections/${collectionId}/items`);
        const items = res.data?.items || [];
        const exists = items.some((i) => Number(i.recipe_id) === Number(recipe.id));
        setIsInSelectedCollection(Boolean(exists));
      } catch (err) {
        setIsInSelectedCollection(false);
      } finally {
        setCheckingSelectedCollection(false);
      }
    };

    checkSelectedCollection();
  }, [user, recipe?.id, selectedCollectionId]);

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!recipe?.id || saveLoading) return;

    try {
      setSaveLoading(true);
      const res = await api.post('/api/collections/saved/toggle', { recipeId: recipe.id });
      const saved = Boolean(res.data?.saved);
      setIsSaved(saved);
      showToast(saved ? 'Saved!' : 'Removed from saved', saved ? 'success' : 'info');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save recipe', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (selectedCollectionId === '__new__') {
      showToast('Create the collection first', 'error');
      return;
    }

    const collectionId = parseInt(selectedCollectionId, 10);
    if (!Number.isFinite(collectionId) || !recipe?.id) {
      showToast('Select a collection first', 'error');
      return;
    }

    if (isInSelectedCollection) {
      showToast('Already in this collection', 'info');
      return;
    }

    try {
      await api.post(`/api/collections/${collectionId}/items`, { recipeId: recipe.id });
      setIsInSelectedCollection(true);
      showToast('Added to collection', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add to collection', 'error');
    }
  };

  const handleCreateCollection = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const name = String(newCollectionName || '').trim();
    if (!name) {
      showToast('Enter a collection name', 'error');
      return;
    }

    try {
      setCreateCollectionLoading(true);
      const res = await api.post('/api/collections', { name, isPublic: false });
      const created = res.data?.collection;
      if (created?.id) {
        setCollections((prev) => [...(prev || []), created]);
        setSelectedCollectionId(String(created.id));
        setNewCollectionName('');
        showToast('Collection created', 'success');
      } else {
        showToast('Collection created', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create collection', 'error');
    } finally {
      setCreateCollectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
        <div className="w-full px-3 sm:px-4 lg:max-w-6xl lg:mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
            <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading recipe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
        <div className="w-full px-3 sm:px-4 lg:max-w-6xl lg:mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {error}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The recipe you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const likeCount = parseInt(recipe.likes || '0');
  const dislikeCount = parseInt(recipe.dislikes || '0');

  const canSeeModerationInfo =
    !!user &&
    (user.role === 'admin' || (user.role === 'chef' && recipe.chef_id === user.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="w-full px-3 sm:px-4 lg:max-w-6xl lg:mx-auto">
        {/* Breadcrumb */}
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
          <button onClick={() => navigate('/')} className="hover:text-green-600 dark:hover:text-green-400">
            Home
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{recipe.title}</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Recipe Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            {canSeeModerationInfo && recipe.status === 'rejected' && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="font-semibold text-red-900 dark:text-red-200">This recipe was rejected.</p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  Edit it and resubmit from your chef dashboard to get it approved.
                </p>
                {recipe.last_review?.feedback && (
                  <p className="mt-2 text-sm text-red-800 dark:text-red-300">
                    <span className="font-semibold">Admin feedback:</span> {recipe.last_review.feedback}
                  </p>
                )}
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {recipe.title}
            </h1>
            
            {recipe.chef_name && (
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                by <span className="font-semibold text-green-600 dark:text-green-400">{recipe.chef_name}</span>
              </p>
            )}

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {recipe.description}
            </p>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-3 mb-4">
              {recipe.difficulty && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm capitalize">
                  {recipe.difficulty}
                </span>
              )}
              {recipe.cuisine && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  {recipe.cuisine}
                </span>
              )}
              {recipe.spice_level && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm capitalize">
                  🌶️ {recipe.spice_level}
                </span>
              )}
              {recipe.calories && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                  {recipe.calories} cal
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
              <button
                onClick={handleToggleSave}
                disabled={saveLoading}
                className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 
                               disabled:opacity-60 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </button>

              {user ? (
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    disabled={collectionsLoading}
                    className="w-full sm:w-56 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    aria-label="Select collection"
                  >
                    <option value="">Select collection</option>
                    {collections
                      .filter((c) => String(c.name || '').toLowerCase() !== 'saved')
                      .map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}{c.is_public ? ' (Public)' : ''}
                        </option>
                      ))}
                    <option value="__new__">+ Create new collection…</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddToCollection}
                    disabled={!selectedCollectionId || selectedCollectionId === '__new__' || collectionsLoading || checkingSelectedCollection || isInSelectedCollection}
                    className={`w-full sm:w-auto justify-center flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base disabled:opacity-60 ${
                      isInSelectedCollection
                        ? 'bg-green-600 text-white'
                        : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isInSelectedCollection ? (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Added
                      </>
                    ) : (
                      'Add to Collection'
                    )}
                  </button>

                  {selectedCollectionId === '__new__' ? (
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                      <input
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="New collection name"
                        className="w-full sm:w-56 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCollection}
                        disabled={createCollectionLoading}
                        className="w-full sm:w-auto justify-center flex items-center px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Create
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 
                               hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                               rounded-lg transition-colors text-sm sm:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              
              {/* REPORT BUTTON - Content Moderation Integration */}
              <ReportButton
                contentType="recipe"
                contentId={recipe.id}
                contentTitle={recipe.title}
                variant="full"
                className="w-full sm:w-auto sm:ml-auto"
              />
            </div>

            {/* Time, Servings, Likes */}
            <div className="flex flex-wrap gap-6 text-gray-700 dark:text-gray-300">
              {recipe.prep_time && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span><strong>Prep:</strong> {recipe.prep_time} min</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>
                  </svg>
                  <span><strong>Cook:</strong> {recipe.cook_time} min</span>
                </div>
              )}
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span><strong>Total:</strong> {totalTime} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  <span><strong>Servings:</strong> {recipe.servings}</span>
                </div>
              )}
              {likeCount > 0 && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <span><strong>{likeCount}</strong> {likeCount === 1 ? 'like' : 'likes'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recipe Image */}
          {recipe.image_url && (
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-300 dark:bg-gray-700">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading image...</div>
                </div>
              )}
              <img
                src={resolveImageUrl(recipe.image_url)}
                alt={recipe.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 p-6">
            {/* Ingredients Section */}
            <div className="md:col-span-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Ingredients
              </h2>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                      <span>
                        <strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No ingredients listed</p>
              )}
            </div>

            {/* Instructions Section */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Instructions
              </h2>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="space-y-4">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 pt-1">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No instructions provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back
          </button>
        </div>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  );
};

export default RecipeDetailPage;
