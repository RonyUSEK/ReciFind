import React, { useState, useEffect } from 'react';
import './App.css';

// API base URL - uses proxy in development, relative path in production
const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('loading');

  // Check backend health
  useEffect(() => {
    checkHealth();
  }, []);

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
    } catch (err) {
      setDbStatus('disconnected');
    }
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/todos`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    
    if (!newTodo.trim()) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTodo }),
      });

      if (!response.ok) {
        throw new Error('Failed to add todo');
      }

      const data = await response.json();
      setTodos([data, ...todos]);
      setNewTodo('');
    } catch (err) {
      setError(err.message);
      console.error('Error adding todo:', err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }

      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting todo:', err);
    }
  };

  const handleToggleTodo = async (id, completed) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      const updatedTodo = await response.json();
      setTodos(todos.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (err) {
      setError(err.message);
      console.error('Error updating todo:', err);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>📝 Todo App</h1>
        <p>Fullstack Demo: React + Express + PostgreSQL</p>
        <span className={`status-badge status-${dbStatus}`}>
          {dbStatus === 'connected' && '✓ Database Connected'}
          {dbStatus === 'disconnected' && '✗ Database Disconnected'}
          {dbStatus === 'loading' && '⏳ Checking Connection...'}
        </span>
      </div>

      <div className="card">
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleAddTodo} className="input-section">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !newTodo.trim()}
          >
            Add Todo
          </button>
        </form>

        {loading ? (
          <div className="loading">
            <p>Loading todos...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <p>No todos yet. Add one above to get started!</p>
          </div>
        ) : (
          <ul className="todos-list">
            {todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo.id, todo.completed)}
                />
                <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                  {todo.title}
                </span>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteTodo(todo.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          {todos.length} {todos.length === 1 ? 'todo' : 'todos'} total
        </div>
      </div>
    </div>
  );
}

export default App;
