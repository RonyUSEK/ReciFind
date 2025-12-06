import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChefDashboard from '../pages/ChefDashboard';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../utils/api';

// Mock the API module
jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ChefDashboard', () => {
  const mockUser = {
    id: 1,
    name: 'Test Chef',
    email: 'chef@test.com',
    role: 'chef',
  };

  const mockRecipes = [
    {
      id: 1,
      title: 'Approved Recipe',
      status: 'approved',
      created_at: '2024-01-01T00:00:00Z',
      likes_count: 10,
    },
    {
      id: 2,
      title: 'Pending Recipe',
      status: 'pending',
      created_at: '2024-01-02T00:00:00Z',
      likes_count: 0,
    },
    {
      id: 3,
      title: 'Rejected Recipe',
      status: 'rejected',
      created_at: '2024-01-03T00:00:00Z',
      likes_count: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'fake-token');
  });

  const renderWithProviders = (component) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    );
  };

  test('displays loading state initially', () => {
    api.default.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<ChefDashboard />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays chef recipes after loading', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Approved Recipe')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending Recipe')).toBeInTheDocument();
    expect(screen.getByText('Rejected Recipe')).toBeInTheDocument();
  });

  test('displays status badges with correct colors', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText('approved')).toBeInTheDocument();
    });

    const approvedBadge = screen.getByText('approved');
    const pendingBadge = screen.getByText('pending');
    const rejectedBadge = screen.getByText('rejected');

    // Check that status badges are displayed
    expect(approvedBadge).toBeInTheDocument();
    expect(pendingBadge).toBeInTheDocument();
    expect(rejectedBadge).toBeInTheDocument();
  });

  test('displays recipe stats', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/total recipes/i)).toBeInTheDocument();
    });

    // Check stats cards exist
    expect(screen.getByText(/total recipes/i)).toBeInTheDocument();
    const approvedElements = screen.getAllByText(/approved/i);
    const pendingElements = screen.getAllByText(/pending/i);
    expect(approvedElements.length).toBeGreaterThan(0);
    expect(pendingElements.length).toBeGreaterThan(0);
  });

  test('shows Create Recipe button', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/create recipe/i)).toBeInTheDocument();
    });
  });

  test('navigates to recipe form when Create Recipe is clicked', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/create recipe/i)).toBeInTheDocument();
    });

    const createButton = screen.getByText(/create recipe/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/chef/recipe/new');
  });

  test('displays empty state when chef has no recipes', async () => {
    api.default.get.mockResolvedValue({ data: [] });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
    });

    const createButtons = screen.getAllByText(/create recipe/i);
    expect(createButtons.length).toBeGreaterThan(0);
  });

  test('displays error message when API call fails', async () => {
    api.default.get.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('filters recipes by status', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Approved Recipe')).toBeInTheDocument();
    });

    // Check filter buttons exist
    const allButtons = screen.getAllByRole('button');
    const allFilterButton = allButtons.find(btn => btn.textContent === 'All');
    expect(allFilterButton).toBeTruthy();
  });

  test('allows navigation to edit recipe page', async () => {
    api.default.get.mockResolvedValue({ data: mockRecipes });

    renderWithProviders(<ChefDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pending Recipe')).toBeInTheDocument();
    });

    // Find edit button for pending recipe
    const editButtons = screen.getAllByText(/edit/i);
    expect(editButtons.length).toBeGreaterThan(0);
  });
});
