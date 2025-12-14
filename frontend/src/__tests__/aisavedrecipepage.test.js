import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AISavedRecipePage from '../pages/AISavedRecipePage';
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

describe('AISavedRecipePage', () => {
  test('loads and renders saved AI recipe snapshot', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        itemId: 77,
        aiRecipe: {
          title: 'AI Pancakes',
          description: 'Fluffy',
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
          instructions: ['Mix', 'Cook'],
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/ai/77']}>
        <Routes>
          <Route path="/ai/:itemId" element={<AISavedRecipePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('AI Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('1 cup flour')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText('Mix')).toBeInTheDocument();
    expect(screen.getByText('Cook')).toBeInTheDocument();
  });
});
