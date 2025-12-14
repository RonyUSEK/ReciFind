import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function ProfilePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/api/collections/public/${id}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="w-full px-3 sm:px-4 lg:max-w-5xl lg:mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400">Loading profile…</div>
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
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const user = profile?.user;
  const collections = profile?.collections || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
      <div className="w-full px-3 sm:px-4 lg:max-w-5xl lg:mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user?.name || 'Profile'}
          </h1>
          {user?.bio ? (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{user.bio}</p>
          ) : null}

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Public Collections</h2>

            {collections.length === 0 ? (
              <p className="mt-2 text-gray-600 dark:text-gray-400">No public collections yet.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {collections.map((c) => (
                  <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{c.name}</div>
                        {c.description ? (
                          <div className="text-sm text-gray-600 dark:text-gray-400">{c.description}</div>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Public</div>
                    </div>

                    {(c.items || []).length === 0 ? (
                      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">No items yet.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {(c.items || []).map((item) => (
                          <div key={item.item_id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {item.recipe_id ? (item.recipe_title || `Recipe #${item.recipe_id}`) : (item.ai_recipe?.title || 'AI Recipe')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{item.recipe_id ? 'Recipe' : 'AI recipe'}</div>
                            </div>
                            {item.recipe_id ? (
                              <Link
                                to={`/recipe/${item.recipe_id}`}
                                className="shrink-0 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                              >
                                View
                              </Link>
                            ) : (
                              <Link
                                to={`/ai/${item.item_id}`}
                                className="shrink-0 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                              >
                                View
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
