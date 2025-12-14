import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 123, name: 'Test User', email: 'test@example.com', role: 'user' },
    refreshSession: jest.fn(async () => ({ success: true, user: { role: 'user' } })),
  }),
}));

describe('Dashboard demotion handling', () => {
  test('shows reapply option when application is approved but role is user', async () => {
    const api = require('../utils/api').default;
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/my-application') {
        return Promise.resolve({ data: { status: 'approved', created_at: new Date().toISOString() } });
      }
      if (url === '/api/collections/my') {
        return Promise.resolve({
          data: {
            collections: [
              { id: 1, name: 'Saved', item_count: '0', is_public: false },
              { id: 2, name: 'My List', item_count: '0', is_public: false },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Want to share your recipes\?/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/demoted back to a normal user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply as Chef/i })).toBeInTheDocument();
  });
});
