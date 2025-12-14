import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SavedRecipesPage from '../pages/SavedRecipesPage';
import api from '../utils/api';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('SavedRecipesPage', () => {
  test('lists saved items and allows removing', async () => {
    const user = userEvent.setup();

    api.get
      .mockResolvedValueOnce({
        data: {
          collections: [{ id: 10, name: 'Saved', item_count: '2', is_public: false }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            { item_id: 101, recipe_id: 5, recipe_title: 'Pasta', recipe_image_url: null },
            { item_id: 102, recipe_id: null, ai_recipe: { title: 'AI Soup' } },
          ],
        },
      });

    api.delete.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/saved']}>
        <Routes>
          <Route path="/saved" element={<SavedRecipesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Saved Recipes')).toBeInTheDocument();
    expect(await screen.findByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('AI Soup')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/collections/10/items/101');
    });
  });
});
