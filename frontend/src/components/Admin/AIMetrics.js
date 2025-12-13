import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

function AIMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [usageError, setUsageError] = useState('');
  const [actionError, setActionError] = useState('');
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Pagination for generations list
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  useEffect(() => {
    fetchUsage();
  }, []);

  useEffect(() => {
    if (activeTab === 'generations') {
      fetchGenerations();
    }
  }, [activeTab, currentPage]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/ai-metrics?period=${period}`);
      setMetrics(response.data);
      setMetricsError('');
    } catch (err) {
      console.error('Error fetching AI metrics:', err);
      setMetricsError(err.response?.data?.error || `Failed to load AI metrics (${err.response?.status || 'network'})`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await api.get('/api/admin/ai-usage');
      setUsage(response.data);
      setUsageError('');
    } catch (err) {
      console.error('Error fetching AI usage:', err);
      setUsageError(err.response?.data?.error || `Failed to load AI credits (${err.response?.status || 'network'})`);
    }
  };

  const resetMyUsage = async () => {
    try {
      await api.post('/api/admin/ai-usage/reset');
      await fetchUsage();
      setActionError('');
    } catch (err) {
      console.error('Error resetting my AI usage:', err);
      setActionError(err.response?.data?.error || 'Failed to reset AI usage');
    }
  };

  const resetUserUsage = async (userId) => {
    try {
      await api.post(`/api/admin/ai-usage/${userId}/reset`);
      await fetchUsage();
      setActionError('');
    } catch (err) {
      console.error('Error resetting user AI usage:', err);
      setActionError(err.response?.data?.error || 'Failed to reset user AI usage');
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([fetchUsage(), fetchMetrics()]);
  };

  const fetchGenerations = async () => {
    try {
      const response = await api.get(`/api/admin/ai-generations?page=${currentPage}&limit=20`);
      setGenerations(response.data.generations);
      setTotalPages(response.data.pagination.pages);
    } catch (err) {
      console.error('Error fetching AI generations:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(metricsError || usageError || actionError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-1">
          {metricsError ? <p className="text-red-800 dark:text-red-200">{metricsError}</p> : null}
          {usageError ? <p className="text-red-800 dark:text-red-200">{usageError}</p> : null}
          {actionError ? <p className="text-red-800 dark:text-red-200">{actionError}</p> : null}
          <button
            onClick={handleRefreshAll}
            className="mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Recipe Generation Metrics
        </h2>

        <button
          onClick={resetMyUsage}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
        >
          Reset My AI Usage
        </button>
        
        {/* Period Selector */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Daily credits */}
      {usage?.users?.length ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily AI Credits</h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Limit: {usage.dailyLimit} per user / day
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Used</th>
                  <th className="py-2 pr-4">Remaining</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {usage.users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                      <div className="text-gray-600 dark:text-gray-300">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">{u.role}</td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">{u.usedToday}</td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">{u.remainingToday}</td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => resetUserUsage(u.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-200 rounded-md transition-colors"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Daily AI Credits</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Credits are not available yet. If you just restarted the backend, wait a few seconds and click Retry.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('generations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generations'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All Generations
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Generations
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.stats.totalGenerations}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Success Rate
              </div>
              <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                {metrics.stats.successRate}%
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Tokens
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.stats.totalTokens.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Unique Users
              </div>
              <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.stats.uniqueUsers}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Users */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top Users
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {metrics.topUsers.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user.generation_count} generations
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.total_tokens} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Ingredients */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Popular Ingredients
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {metrics.topIngredients.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {item.ingredient}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${(item.usage_count / metrics.topIngredients[0].usage_count) * 100}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                          {item.usage_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          {metrics.timeline.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generation Timeline
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {metrics.timeline.map((day) => (
                    <div key={day.date} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 text-xs text-white font-semibold"
                            style={{
                              width: `${(day.successful / Math.max(...metrics.timeline.map(d => d.generations))) * 100}%`,
                              minWidth: day.successful > 0 ? '30px' : '0'
                            }}
                          >
                            {day.successful > 0 && day.successful}
                          </div>
                        </div>
                        {day.failed > 0 && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {day.failed} failed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {metrics.errors.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Recent Errors
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {metrics.errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">
                        {error.error_message}
                      </span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {error.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generations List Tab */}
      {activeTab === 'generations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ingredients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {generations.map((gen) => (
                    <tr key={gen.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {gen.user_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {gen.user_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {gen.ingredients.slice(0, 3).join(', ')}
                          {gen.ingredients.length > 3 && ` +${gen.ingredients.length - 3}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {gen.tokens_used || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {gen.success ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Success
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(gen.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIMetrics;
