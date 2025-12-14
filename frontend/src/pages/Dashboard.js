import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loadingApplication, setLoadingApplication] = useState(true);

  const [loadingCollectionsSummary, setLoadingCollectionsSummary] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [collectionsCount, setCollectionsCount] = useState(0);

  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (user?.role !== 'user') {
        setLoadingApplication(false);
        return;
      }

      try {
        const response = await api.get('/api/auth/my-application');
        setApplicationStatus(response.data);
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error('Error fetching application:', err);
        }
        setApplicationStatus(null);
      } finally {
        setLoadingApplication(false);
      }
    };

    fetchApplicationStatus();
  }, [user]);

  useEffect(() => {
    const fetchCollectionsSummary = async () => {
      if (!user) return;
      try {
        setLoadingCollectionsSummary(true);
        const colRes = await api.get('/api/collections/my');
        const list = colRes.data?.collections || [];
        const saved = list.find((c) => String(c.name || '').toLowerCase() === 'saved');
        setSavedCount(parseInt(saved?.item_count || '0', 10) || 0);
        setCollectionsCount(list.filter((c) => String(c.name || '').toLowerCase() !== 'saved').length);
      } catch (err) {
        setSavedCount(0);
        setCollectionsCount(0);
      } finally {
        setLoadingCollectionsSummary(false);
      }
    };

    fetchCollectionsSummary();
  }, [user]);

  return (
    <main className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8 lg:py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Dashboard</h1>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Welcome back, <span className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</span>!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Role: <span className="font-medium text-green-600 dark:text-green-400 capitalize">{user?.role}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Email: {user?.email}</p>
        </div>

        {user?.role === 'user' && !loadingApplication && (
          <>
            {!applicationStatus ? (
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">Want to share your recipes?</h3>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Apply to become a chef and start submitting your own recipes to the platform! Share your culinary expertise with our community.
                </p>
                <button
                  onClick={() => navigate('/apply-chef')}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Apply as Chef
                </button>
              </div>
            ) : applicationStatus.status === 'pending' ? (
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Chef Application Under Review</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                  Your chef application is currently being reviewed by our admin team. You'll be notified once a decision is made.
                </p>
                <button
                  onClick={() => navigate('/application-status')}
                  className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  View Application Status
                </button>
              </div>
            ) : applicationStatus.status === 'rejected' ? (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Application Not Approved</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  Your chef application was not approved. You can view the feedback and reapply when you're ready.
                </p>
                <button
                  onClick={() => navigate('/application-status')}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  View Feedback & Reapply
                </button>
              </div>
            ) : applicationStatus.status === 'approved' ? (
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">Want to share your recipes?</h3>
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  Apply to become a chef and start submitting your own recipes to the platform! Share your culinary expertise with our community.
                </p>
                <p className="text-xs text-green-800/80 dark:text-green-200/80 mb-4">Note: your chef access was removed and you were demoted back to a normal user.</p>
                <button
                  onClick={() => navigate('/apply-chef')}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Apply as Chef
                </button>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Recipes</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {loadingCollectionsSummary ? 'Loading…' : `${savedCount} saved recipe${savedCount === 1 ? '' : 's'}`}
            </p>
            <button
              onClick={() => navigate('/saved')}
              className="mt-3 w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg"
            >
              View saved
            </button>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Collections</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {loadingCollectionsSummary ? 'Loading…' : `${collectionsCount} collection${collectionsCount === 1 ? '' : 's'}`}
            </p>
            <button
              onClick={() => navigate('/collections')}
              className="mt-3 w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              Manage collections
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
