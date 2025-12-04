import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { API_BASE_URL } from './utils/api';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import Dashboard from './pages/Dashboard';
import RecipeDetailPage from './pages/RecipeDetailPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

// Header component with user menu
const Header = ({ theme, toggleTheme }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-green-600">Reci</span>
          <span className="text-orange-600">Find</span>
        </Link>

         <div className="flex items-center gap-2 sm:gap-0">
          <button 
            id="theme-toggle" 
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition duration-300 sm:mr-4 touch-manipulation"
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 008.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            )}
          </button>
          
          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition duration-300 shadow-lg touch-manipulation flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="hidden sm:inline">{user?.name}</span>
              </button>
              
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 border border-gray-200 dark:border-gray-700">
                  <Link 
                    to="/dashboard" 
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Dashboard
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button 
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Log Out
                  </button>
                </div>
                )}
                {process.env.NODE_ENV !== 'production' && (
                  <div className="ml-4 text-xs text-gray-600 dark:text-gray-300">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">API: {API_BASE_URL}</span>
                  </div>
                )}
            </div>
          ) : (
            <Link to="/login">
              <button className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition duration-300 shadow-lg touch-manipulation">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:mr-2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="hidden sm:inline">Log In</span>
                </div>
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

// Footer component
const Footer = () => (
  <footer className="bg-gray-800 dark:bg-gray-900 text-white mt-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
      <p>&copy; 2024 ReciFind. All rights reserved.</p>
      <div className="mt-4 space-x-4 text-sm">
        <a href="#" className="hover:text-green-400 transition duration-150">Privacy Policy</a>
        <a href="#" className="hover:text-green-400 transition duration-150">Terms of Service</a>
        <a href="#" className="hover:text-green-400 transition duration-150">Contact</a>
      </div>
    </div>
  </footer>
);

// Layout wrapper
const Layout = ({ children, theme, toggleTheme }) => (
  <div className="min-h-screen bg-[#f7f7f7] dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <Header theme={theme} toggleTheme={toggleTheme} />
    {children}
    <Footer />
  </div>
);

const AppContent = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    return (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <Layout theme={theme} toggleTheme={toggleTheme}>
          <HomePage theme={theme} toggleTheme={toggleTheme} />
        </Layout>
      } />
      <Route path="/search" element={
        <Layout theme={theme} toggleTheme={toggleTheme}>
          <SearchPage />
        </Layout>
      } />
      <Route path="/recipe/:id" element={
        <Layout theme={theme} toggleTheme={toggleTheme}>
          <RecipeDetailPage />
        </Layout>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout theme={theme} toggleTheme={toggleTheme}>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
