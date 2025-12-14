import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from '../pages/ProfilePage';
import api from '../utils/api';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ProfilePage', () => {
  test('renders public collections and links to recipe and AI items', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 5, name: 'Test User', bio: 'Hello' },
        collections: [
          {
            id: 1,
            name: 'Public List',
            description: 'Desc',
            is_public: true,
            items: [
              { item_id: 10, recipe_id: 123, recipe_title: 'Pasta' },
              { item_id: 11, recipe_id: null, ai_recipe: { title: 'AI Soup' } },
            ],
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={['/profile/5']}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Public Collections')).toBeInTheDocument();
    expect(screen.getByText('Public List')).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('AI Soup')).toBeInTheDocument();

    const recipeLink = screen.getAllByRole('link', { name: 'View' }).find((a) => a.getAttribute('href') === '/recipe/123');
    expect(recipeLink).toBeTruthy();

    const aiLink = screen.getAllByRole('link', { name: 'View' }).find((a) => a.getAttribute('href') === '/ai/11');
    expect(aiLink).toBeTruthy();
  });
});
