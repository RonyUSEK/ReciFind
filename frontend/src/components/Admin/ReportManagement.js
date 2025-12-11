import React, { useState, useEffect } from 'react';
import useToast from '../../hooks/useToast';
import useConfirm from '../../hooks/useConfirm';
import Toast from '../Common/Toast';
import ConfirmModal from '../Common/ConfirmModal';
import { API_BASE_URL } from '../../utils/api';

/**
 * ReportManagement Component
 * Admin interface for reviewing and resolving content reports
 */
function ReportManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, resolved, dismissed, all
  const [contentTypeFilter, setContentTypeFilter] = useState('all'); // all, recipe, comment
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { toast, showToast, hideToast } = useToast();
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filter, contentTypeFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/api/admin/reports`;
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (contentTypeFilter !== 'all') params.append('content_type', contentTypeFilter);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      showToast('Failed to load reports: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleResolveReport = (reportId, action, actionLabel) => {
    setPendingAction({ reportId, action, actionLabel });
    setAdminNotes('');
    setShowNotesModal(true);
  };

  const confirmResolveWithNotes = () => {
    setShowNotesModal(false);
    showConfirm({
      title: `${pendingAction.actionLabel}?`,
      message: `Are you sure you want to ${pendingAction.actionLabel.toLowerCase()}? This action cannot be undone.`,
      confirmStyle: pendingAction.action === 'ban_user' ? 'danger' : 'primary',
      confirmText: pendingAction.actionLabel,
      onConfirm: async () => {
        await resolveReport(pendingAction.reportId, pendingAction.action);
      }
    });
  };

  const resolveReport = async (reportId, action) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, admin_notes: adminNotes || null })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve report');
      }

      showToast(data.message || 'Report resolved successfully', 'success');
      fetchReports();
      fetchStats();
      setSelectedReport(null);
    } catch (error) {
      showToast('Failed to resolve report: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissReport = (reportId) => {
    setPendingAction({ reportId, action: 'dismiss', actionLabel: 'Dismiss Report' });
    setAdminNotes('');
    setShowNotesModal(true);
  };

  const confirmDismissWithNotes = () => {
    setShowNotesModal(false);
    showConfirm({
      title: 'Dismiss Report',
      message: 'Dismiss this report without taking any action?',
      confirmStyle: 'primary',
      confirmText: 'Dismiss',
      onConfirm: async () => {
        await dismissReport(pendingAction.reportId);
      }
    });
  };

  const dismissReport = async (reportId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/dismiss`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: adminNotes || null })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dismiss report');
      }

      showToast('Report dismissed', 'info');
      fetchReports();
      fetchStats();
      setSelectedReport(null);
    } catch (error) {
      showToast('Failed to dismiss report: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonLabel = (reason) => {
    const labels = {
      spam: 'Spam',
      inappropriate: 'Inappropriate',
      incorrect: 'Incorrect Information',
      copyright: 'Copyright Violation',
      harassment: 'Harassment',
      offensive: 'Offensive Content',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Content Moderation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review and manage reported content
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Reports</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recipe_reports}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Recipe Reports</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.comment_reports}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Comment Reports</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Type
            </label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="recipe">Recipes</option>
              <option value="comment">Comments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Reports Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'pending' ? 'No pending reports to review' : 'No reports match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded">
                      {report.content_type.toUpperCase()}
                    </span>
                    {getStatusBadge(report.status)}
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded">
                      {getReasonLabel(report.reason)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {report.content_preview || 'Content Preview Unavailable'}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Reported by:</strong> {report.reporter_name} ({report.reporter_email})</p>
                    <p><strong>Content author:</strong> {report.content_author_name || 'Unknown'}</p>
                    <p><strong>Reported:</strong> {formatDate(report.created_at)}</p>
                    {report.description && (
                      <p className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                        <strong>Details:</strong> {report.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {report.status === 'pending' && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {report.content_type === 'recipe' && (
                    <button
                      onClick={() => window.open(`/recipe/${report.content_id}`, '_blank')}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                               transition-colors"
                    >
                      View Recipe
                    </button>
                  )}
                  <button
                    onClick={() => handleDismissReport(report.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 
                             dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Dismiss Report
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id, 'warn_user', 'Warn User')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 
                             dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400 rounded-lg
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Warn User
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id, 'remove_content', 'Remove Content')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 
                             dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-400 rounded-lg
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Remove Content
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id, 'ban_user', 'Ban User')}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Ban User
                  </button>
                </div>
              )}

              {/* Resolution Info */}
              {report.status !== 'pending' && report.reviewed_by && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <strong>Resolved by:</strong> {report.reviewer_name} on {formatDate(report.resolved_at)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add Admin Notes (Optional)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              These notes will be saved with this report action for audit purposes.
            </p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Enter your notes here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700
                         dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={pendingAction?.action === 'dismiss' ? confirmDismissWithNotes : confirmResolveWithNotes}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={actionLoading}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
      />

      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  );
}

export default ReportManagement;
