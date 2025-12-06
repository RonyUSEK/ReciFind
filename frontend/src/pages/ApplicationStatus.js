import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

function ApplicationStatus() {
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const successMessage = location.state?.message;

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/my-application');
      setApplication(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No application found');
      } else {
        setError('Failed to load application status');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              No Application Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't submitted a chef application yet.
            </p>
            <button
              onClick={() => navigate('/apply-chef')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Application Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Chef Application Status
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Submitted on {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(application.status)}`}>
              {application.status.toUpperCase()}
            </span>
          </div>

          {/* Status-specific messages */}
          {application.status === 'pending' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Under Review
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Your application is currently being reviewed by our admin team. This typically takes 1-3 business days. 
                We'll notify you via email once a decision has been made.
              </p>
            </div>
          )}

          {application.status === 'approved' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                🎉 Congratulations!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-400 mb-3">
                Your chef application has been approved! You can now start submitting your recipes.
              </p>
              <button
                onClick={() => navigate('/chef/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                Go to Chef Dashboard
              </button>
            </div>
          )}

          {application.status === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                Application Not Approved
              </h3>
              {application.admin_feedback && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                    Feedback from admin:
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-3 rounded">
                    {application.admin_feedback}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                Don't worry! You can submit a new application addressing the feedback above.
              </p>
              <button
                onClick={() => navigate('/apply-chef')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                Reapply
              </button>
            </div>
          )}

          {/* Application Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Application Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                  <p className="text-gray-900 dark:text-white">{application.full_name}</p>
                </div>

                {application.experience_years && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience</label>
                    <p className="text-gray-900 dark:text-white">{application.experience_years} years</p>
                  </div>
                )}

                {application.specialty && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Specialty</label>
                    <p className="text-gray-900 dark:text-white">{application.specialty}</p>
                  </div>
                )}

                {application.instagram_handle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Instagram</label>
                    <p className="text-gray-900 dark:text-white">{application.instagram_handle}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Professional Bio</label>
              <p className="text-gray-900 dark:text-white mt-1">{application.bio}</p>
            </div>

            {application.sample_recipe_title && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sample Recipe</label>
                <p className="text-gray-900 dark:text-white font-medium">{application.sample_recipe_title}</p>
                {application.sample_recipe_description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{application.sample_recipe_description}</p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Motivation</label>
              <p className="text-gray-900 dark:text-white mt-1">{application.motivation}</p>
            </div>

            {application.reviewed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewed</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(application.reviewed_at).toLocaleDateString()} 
                  {application.reviewer_name && ` by ${application.reviewer_name}`}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicationStatus;
