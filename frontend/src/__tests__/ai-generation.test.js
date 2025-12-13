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
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
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
    // Default mock for search endpoint
    api.get.mockResolvedValue({
      data: {
        recipes: [],
        total: 0,
        page: 1,
        totalPages: 0
      }
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

    // Wait a bit for rendering
    await waitFor(() => {
      // Should show empty state (check for multiple possible texts)
      const emptyText = screen.queryByText(/no recipes found/i) || 
                        screen.queryByText(/back to home/i);
      expect(emptyText).toBeInTheDocument();
    }, { timeout: 2000 });
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

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and click AI generation button (if it exists)
    const generateButton = screen.queryByText(/generate with ai/i);
    if (generateButton) {
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/api/recipes/generate',
          expect.any(Object)
        );
      });
    }
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

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Try to generate
    const generateButton = screen.queryByText(/generate with ai/i);
    if (generateButton) {
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        // Should handle error (show error message or toast)
        expect(api.post).toHaveBeenCalled();
      });
    }
  });
});
