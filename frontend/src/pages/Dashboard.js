import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

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
