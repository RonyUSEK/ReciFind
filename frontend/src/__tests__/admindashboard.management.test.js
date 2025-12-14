import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';

// Mock axios before importing api
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
}));

const api = require('../utils/api').default;

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@recifind.com', role: 'admin' },
    loading: false,
  }),
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</BrowserRouter>
);

describe('AdminDashboard management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('can edit a user name/email', async () => {
    const user = userEvent.setup();

    let usersState = [
      {
        id: 10,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user',
        reputation_score: 0,
        created_at: new Date().toISOString(),
      },
    ];

    api.get.mockImplementation((url) => {
      if (String(url).startsWith('/api/admin/chef-applications')) {
        return Promise.resolve({ data: { applications: [] } });
      }
      if (url === '/api/admin/users') {
        return Promise.resolve({ data: { users: usersState } });
      }
      return Promise.resolve({ data: {} });
    });

    api.patch.mockImplementation((url, body) => {
      if (url === '/api/admin/users/10') {
        usersState = [{ ...usersState[0], ...body }];
        return Promise.resolve({ data: { user: usersState[0] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<AdminDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'User Management' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/admin/users');
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const row = within(table).getByText('Alice').closest('tr');
    expect(row).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: 'Edit' }));

    const modal = screen.getByText('Edit User').closest('div');
    expect(modal).toBeTruthy();

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');

    await act(async () => {
      await user.clear(nameInput);
      await user.type(nameInput, 'Alice Updated');
      await user.clear(emailInput);
      await user.type(emailInput, 'alice.updated@example.com');
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/users/10', {
        name: 'Alice Updated',
        email: 'alice.updated@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
      expect(screen.getByText('Alice Updated')).toBeInTheDocument();
    });
  });

  test('can edit a recipe (ingredients/instructions/chef)', async () => {
    const user = userEvent.setup();

    const recipeRow = {
      id: 123,
      title: 'Admin Recipe',
      status: 'pending',
      source_type: 'chef',
      chef_id: 10,
      chef_name: 'Chef A',
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    api.get.mockImplementation((url, config) => {
      if (String(url).startsWith('/api/admin/chef-applications')) {
        return Promise.resolve({ data: { applications: [] } });
      }
      if (url === '/api/admin/recipes/pending') {
        return Promise.resolve({ data: { recipes: [] } });
      }
      if (url === '/api/admin/recipes') {
        // includesDeleted=true in component
        return Promise.resolve({ data: { recipes: [recipeRow] } });
      }
      if (url === '/api/recipes/123') {
        return Promise.resolve({
          data: {
            ...recipeRow,
            description: 'Original description',
            instructions: ['Step 1'],
            ingredients: [{ name: 'salt', quantity: '1', unit: 'tsp' }],
            prep_time: 5,
            cook_time: 10,
            servings: 2,
            difficulty: 'easy',
            cuisine: 'Test',
            spice_level: 'mild',
            calories: 100,
            image_url: null,
          },
        });
      }
      if (url === '/api/admin/users') {
        return Promise.resolve({ data: { users: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    api.patch.mockResolvedValue({ data: { message: 'Recipe updated successfully', recipe: { id: 123 } } });

    render(<AdminDashboard />, { wrapper: TestWrapper });

    await user.click(screen.getByRole('button', { name: 'Recipes' }));
    await user.click(screen.getByRole('button', { name: 'All Recipes' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/admin/recipes', { params: { includeDeleted: true } });
      expect(screen.getByText('Admin Recipe')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const row = within(table).getByText('Admin Recipe').closest('tr');
    expect(row).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/recipes/123');
      expect(screen.getByText('Edit Recipe')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('Chef ID'));
    await user.type(screen.getByLabelText('Chef ID'), '99');

    await user.clear(screen.getByLabelText('Instructions (one step per line)'));
    await user.type(screen.getByLabelText('Instructions (one step per line)'), 'Step A\nStep B');

    await user.click(screen.getByRole('button', { name: '+ Add' }));
    const ingName2 = screen.getByLabelText('Ingredient name 2');
    await user.type(ingName2, 'pepper');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/recipes/123', expect.objectContaining({
        chef_id: 99,
        instructions: ['Step A', 'Step B'],
      }));
      const payload = api.patch.mock.calls.find((c) => c[0] === '/api/admin/recipes/123')[1];
      expect(Array.isArray(payload.ingredients)).toBe(true);
      expect(payload.ingredients.some((i) => i.name === 'salt')).toBe(true);
      expect(payload.ingredients.some((i) => i.name === 'pepper')).toBe(true);
    });

    await waitFor(() => {
      const allRecipesCalls = api.get.mock.calls.filter((c) => c[0] === '/api/admin/recipes');
      expect(allRecipesCalls.length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText('Edit Recipe')).not.toBeInTheDocument();
    });
  });
});
