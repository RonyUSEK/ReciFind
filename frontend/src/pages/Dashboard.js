import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loadingApplication, setLoadingApplication] = useState(true);

  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (user?.role !== 'user') {
        setLoadingApplication(false);
        return;
      }

      try {
        const response = await api.get('/api/auth/my-application');
        // Backend returns application directly, not wrapped
        setApplicationStatus(response.data);
      } catch (err) {
        // No application found (404) is expected for users who haven't applied
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Dashboard
        </h1>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Welcome back, <span className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</span>!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Role: <span className="font-medium text-green-600 dark:text-green-400 capitalize">{user?.role}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Email: {user?.email}
          </p>
        </div>

        {user?.role === 'user' && !loadingApplication && (
          <>
            {!applicationStatus ? (
              // No application - encourage user to apply
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  Want to share your recipes?
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Apply to become a chef and start submitting your own recipes to the platform! Share your culinary expertise with our community.
                </p>
                <button
                  onClick={() => navigate('/apply-chef')}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Apply as Chef
                </button>
              </div>
            ) : applicationStatus.status === 'pending' ? (
              // Application pending
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Chef Application Under Review
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                  Your chef application is currently being reviewed by our admin team. You'll be notified once a decision is made.
                </p>
                <button
                  onClick={() => navigate('/application-status')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  View Application Status
                </button>
              </div>
            ) : applicationStatus.status === 'rejected' ? (
              // Application rejected
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Application Not Approved
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  Your chef application was not approved. You can view the feedback and reapply when you're ready.
                </p>
                <button
                  onClick={() => navigate('/application-status')}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  View Feedback & Reapply
                </button>
              </div>
            ) : null}
          </>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Favorites
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            No favorites yet. Start exploring recipes!
          </p>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
