import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  }))
}));

const api = require('../utils/api').default;

// Mock useNavigate
const mockedNavigate = jest.fn();
let mockSearchParams = new URLSearchParams('ingredients=chicken,garlic');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useSearchParams: () => [mockSearchParams, jest.fn()],
}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    loading: false
  })
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {children}
  </BrowserRouter>
);

describe('AI Recipe Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams('ingredients=chicken,garlic');

    // Default mocks for endpoints used by SearchPage
    api.get.mockImplementation((url) => {
      if (url === '/api/recipes/ai-credits') {
        return Promise.resolve({
          data: { dailyLimit: 10, usedToday: 0, remainingToday: 10 }
        });
      }

      return Promise.resolve({
        data: {
          recipes: [],
          total: 0,
          page: 1,
          totalPages: 0
        }
      });
    });
  });

  test('should show AI generation button when no results found', async () => {
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const loadingElements = screen.queryAllByText(/loading/i);
      expect(loadingElements.length).toBe(0);
    });


    await waitFor(() => {
      expect(screen.getByText(/no recipes found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate with ai/i })).toBeInTheDocument();
    });
  });

  test('should call AI generation API when generate button clicked', async () => {
    const mockGeneratedRecipe = {
      recipe: {
        title: 'AI Generated Recipe',
        description: 'Test description',
        instructions: ['Step 1', 'Step 2'],
        ingredients: [{ name: 'test', quantity: '100', unit: 'g' }],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        difficulty: 'easy',
        cuisine: 'Italian',
        spice_level: 'mild',
        calories: 400
      }
    };

    api.post.mockResolvedValueOnce({ data: mockGeneratedRecipe });

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    );

    const openAiButton = await screen.findByRole('button', { name: /generate with ai/i });
    fireEvent.click(openAiButton);

    await waitFor(() => {
      expect(screen.getByText(/ai recipe generator/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate recipe/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/recipes/generate',
        expect.objectContaining({
          ingredients: expect.arrayContaining(['chicken', 'garlic']),
          preferences: expect.any(Object)
        })
      );
    });
  });

  test('should handle AI generation error gracefully', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { error: 'Rate limit reached' }
      }
    });

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    );

    const openAiButton = await screen.findByRole('button', { name: /generate with ai/i });
    fireEvent.click(openAiButton);
    await waitFor(() => {
      expect(screen.getByText(/ai recipe generator/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate recipe/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument();
    });
  });
});
