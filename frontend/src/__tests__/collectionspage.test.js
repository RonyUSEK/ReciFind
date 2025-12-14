import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CollectionsPage from '../pages/CollectionsPage';
import api from '../utils/api';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('CollectionsPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    window.confirm.mockRestore();
  });

  test('opens manager and updates/deletes/removes items', async () => {
    const user = userEvent.setup();

    api.get.mockImplementation((url) => {
      if (url === '/api/collections/my') {
        return Promise.resolve({
          data: {
            collections: [
              { id: 99, name: 'Saved', item_count: '0', is_public: false },
              { id: 2, name: 'My List', item_count: '1', is_public: false },
            ],
          },
        });
      }
      if (url === '/api/collections/2/items') {
        return Promise.resolve({
          data: {
            collection: { id: 2, name: 'My List', is_public: false },
            items: [{ item_id: 55, recipe_id: 5, recipe_title: 'Pasta', recipe_image_url: null }],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    api.patch.mockResolvedValueOnce({
      data: { collection: { id: 2, name: 'Renamed', is_public: true } },
    });

    api.delete.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/collections']}>
        <Routes>
          <Route path="/collections" element={<CollectionsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Collections')).toBeInTheDocument();
    expect(await screen.findByText('My List')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Manage' }));

    expect(await screen.findByLabelText('Name')).toBeInTheDocument();
    expect(await screen.findByText('Pasta')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed');

    const publicCheckboxes = screen.getAllByLabelText(/Public \(visible on profile\)/i);
    await user.click(publicCheckboxes[1]);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/collections/2', { name: 'Renamed', isPublic: true });
    });

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/collections/2/items/55');
    });

    await user.click(screen.getByRole('button', { name: /Delete collection/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/collections/2');
    });
  });

  test('creates a collection', async () => {
    const user = userEvent.setup();

    api.get.mockImplementation((url) => {
      if (url === '/api/collections/my') {
        return Promise.resolve({
          data: {
            collections: [
              { id: 99, name: 'Saved', item_count: '0', is_public: false },
              { id: 5, name: 'New', item_count: '0', is_public: false },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    api.post.mockResolvedValueOnce({ data: { collection: { id: 5, name: 'New', is_public: false } } });

    render(
      <MemoryRouter initialEntries={['/collections']}>
        <Routes>
          <Route path="/collections" element={<CollectionsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Collections');

    await user.type(screen.getByPlaceholderText('New collection name'), 'New');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/collections', { name: 'New', isPublic: false });
    });

    expect(await screen.findByText('New')).toBeInTheDocument();
  });
});
