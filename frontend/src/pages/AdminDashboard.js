import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending'); // pending, all
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = async (status = null) => {
    try {
      setLoading(true);
      setError('');
      
      let url = '/api/admin/chef-applications';
      if (status && status !== 'all') {
        url += `?status=${status}`;
      }
      
      const response = await api.get(url);
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.response?.data?.error || 'Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const status = activeTab === 'all' ? null : activeTab;
    fetchApplications(status);
  }, [activeTab]);

  const handleApprove = async (applicationId) => {
    if (!window.confirm('Are you sure you want to approve this chef application?')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/admin/chef-applications/${applicationId}/approve`);
      
      // Refresh applications
      const status = activeTab === 'all' ? null : activeTab;
      await fetchApplications(status);
      
      alert('Application approved successfully! User is now a chef.');
    } catch (err) {
      console.error('Error approving application:', err);
      alert(err.response?.data?.error || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      alert('Please provide feedback for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/admin/chef-applications/${selectedApplication.id}/reject`, {
        feedback: feedback.trim()
      });
      
      // Close modal and refresh
      setShowRejectModal(false);
      setSelectedApplication(null);
      setFeedback('');
      
      const status = activeTab === 'all' ? null : activeTab;
      await fetchApplications(status);
      
      alert('Application rejected with feedback sent to applicant.');
    } catch (err) {
      console.error('Error rejecting application:', err);
      alert(err.response?.data?.error || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (application) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
    setFeedback('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedApplication(null);
    setFeedback('');
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Admin Dashboard - Chef Applications
        </h1>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-4 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Pending Applications
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-4 font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            All Applications
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'pending' ? 'No pending applications at the moment.' : 'No applications found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {app.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Applied by: {app.applicant_name} ({app.applicant_email})
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Submitted: {new Date(app.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Experience</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {app.experience_years ? `${app.experience_years} years` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Specialty</p>
                    <p className="text-gray-900 dark:text-gray-100">{app.specialty || 'Not specified'}</p>
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Bio</p>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{app.bio}</p>
                </div>

                {/* Sample Recipe */}
                {app.sample_recipe_title && (
                  <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sample Recipe</p>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{app.sample_recipe_title}</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{app.sample_recipe_description}</p>
                    
                    {app.sample_recipe_images && Array.isArray(app.sample_recipe_images) && app.sample_recipe_images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {app.sample_recipe_images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Recipe ${idx + 1}`}
                            className="h-24 w-24 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Demo Video */}
                {app.demo_video_url && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Demo Video</p>
                    <a
                      href={app.demo_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline text-sm"
                    >
                      {app.demo_video_url}
                    </a>
                  </div>
                )}

                {/* Social Links */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {app.portfolio_url && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Portfolio</p>
                      <a
                        href={app.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline text-sm"
                      >
                        {app.portfolio_url}
                      </a>
                    </div>
                  )}
                  {app.instagram_handle && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Instagram</p>
                      <a
                        href={`https://instagram.com/${app.instagram_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline text-sm"
                      >
                        {app.instagram_handle}
                      </a>
                    </div>
                  )}
                </div>

                {/* Motivation */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Why Join ReciFind?</p>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{app.motivation}</p>
                </div>

                {/* Review Info (if reviewed) */}
                {app.status !== 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Reviewed by: {app.reviewer_name || 'Unknown'} on{' '}
                      {new Date(app.reviewed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {app.admin_feedback && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Admin Feedback:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{app.admin_feedback}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons (only for pending) */}
                {app.status === 'pending' && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Approve Application
                    </button>
                    <button
                      onClick={() => openRejectModal(app)}
                      disabled={actionLoading}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Reject Application
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Reject Application
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide feedback to help the applicant improve their submission:
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why the application was rejected and what can be improved..."
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !feedback.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Rejecting...' : 'Reject with Feedback'}
              </button>
              <button
                onClick={closeRejectModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminDashboard;
