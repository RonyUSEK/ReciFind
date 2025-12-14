import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ChefApplicationForm from '../pages/ChefApplicationForm';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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
  }),
}));

describe('ChefApplicationForm demotion handling', () => {
  test('does not redirect away when application is approved but role is user', async () => {
    const api = require('../utils/api').default;
    api.get.mockResolvedValueOnce({
      data: { status: 'approved', created_at: new Date().toISOString() },
    });

    render(<ChefApplicationForm />);

    await waitFor(() => {
      expect(screen.getByText(/Join as a Chef/i)).toBeInTheDocument();
    });

    expect(mockedNavigate).not.toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({ state: { message: 'You are already a chef!' } })
    );
  });
});
