import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

// Mock axios before importing api
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
}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false
  })
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {children}
  </BrowserRouter>
);

describe('HomePage Recipe Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Featured Recipe Section', () => {
    test('should fetch and display featured recipe', async () => {
      const mockFeaturedRecipe = {
        id: 1,
        title: 'Spicy Garlic Shrimp',
        description: 'Quick and tasty shrimp dish',
        chef_name: 'Chef Mario',
        prep_time: 10,
        cook_time: 15,
        servings: 4,
        difficulty: 'easy',
        image_url: 'https://example.com/shrimp.jpg',
        is_featured: true,
        status: 'approved'
      };

      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: mockFeaturedRecipe });
      api.get.mockResolvedValueOnce({ data: [] }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/recipes/featured');
      });

      await waitFor(() => {
        expect(screen.getByText('Spicy Garlic Shrimp')).toBeInTheDocument();
      });
    });

    test('should show loading state while fetching featured recipe', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<HomePage />, { wrapper: TestWrapper });

      // Should show some loading indicator
      expect(screen.getByText(/What's Cooking Today/i)).toBeInTheDocument();
    });

    test('should handle error when featured recipe fails to load', async () => {
      // Mock featured to fail, but others to succeed
      api.get.mockRejectedValueOnce(new Error('Network error'));
      api.get.mockResolvedValueOnce({ data: [] }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });

      // Should still render the page even if featured recipe fails
      expect(screen.getByText(/What's Cooking Today/i)).toBeInTheDocument();
    });
  });

  describe('Popular Recipes Section', () => {
    test('should fetch and display popular recipes', async () => {
      const mockPopularRecipes = [
        {
          id: 1,
          title: 'Chicken Curry',
          description: 'Delicious curry',
          chef_name: 'Chef John',
          like_count: 50,
          status: 'approved'
        },
        {
          id: 2,
          title: 'Pasta Carbonara',
          description: 'Classic Italian pasta',
          chef_name: 'Chef Anna',
          like_count: 45,
          status: 'approved'
        }
      ];

      // Mock all three API calls (featured, popular, recent)
      api.get.mockResolvedValueOnce({ data: { id: 99, title: 'Featured Recipe' } });
      api.get.mockResolvedValueOnce({ data: mockPopularRecipes });
      api.get.mockResolvedValueOnce({ data: [] }); // recent recipes
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/recipes/popular', expect.any(Object));
      });

      await waitFor(() => {
        expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
        expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      });
    });

    test('should display popular recipes section heading', async () => {
      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: null }); // featured
      api.get.mockResolvedValueOnce({ data: [] }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Popular Recipes/i)).toBeInTheDocument();
      });
    });

    test('should show loading skeleton while fetching popular recipes', async () => {
      // Mock API to never resolve (simulates loading state)
      api.get.mockImplementation(() => new Promise(() => {}));

      render(<HomePage />, { wrapper: TestWrapper });

      // Should show loading skeletons (animated pulse divs)
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Recipes Section', () => {
    test('should fetch and display recent recipes', async () => {
      const mockRecentRecipes = [
        {
          id: 3,
          title: 'Fresh Salad',
          description: 'Healthy salad',
          chef_name: 'Chef Sarah',
          created_at: '2024-11-20T10:00:00Z',
          status: 'approved'
        }
      ];

      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: { id: 99, title: 'Featured' } });
      api.get.mockResolvedValueOnce({ data: [] }); // popular
      api.get.mockResolvedValueOnce({ data: mockRecentRecipes });
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/recipes/recent', expect.any(Object));
      });

      await waitFor(() => {
        expect(screen.getByText('Fresh Salad')).toBeInTheDocument();
      });
    });

    test('should display recent recipes section heading', async () => {
      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: null }); // featured
      api.get.mockResolvedValueOnce({ data: [] }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Recent Recipes/i)).toBeInTheDocument();
      });
    });

    test('should show loading skeleton while fetching recent recipes', async () => {
      // Mock API to never resolve (simulates loading state)
      api.get.mockImplementation(() => new Promise(() => {}));

      render(<HomePage />, { wrapper: TestWrapper });

      // Should show loading skeletons (animated pulse divs)
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Recipe Filter Tabs', () => {
    test('should filter popular recipes when clicking filter buttons', async () => {
      const mockRecipes = [
        {
          id: 1,
          title: 'Quick Chicken Stir Fry',
          description: 'Fast and easy',
          difficulty: 'easy',
          prep_time: 5,
          cook_time: 10
        },
        {
          id: 2,
          title: 'Slow Beef Stew',
          description: 'Takes time',
          difficulty: 'medium',
          prep_time: 20,
          cook_time: 120
        }
      ];

      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: null }); // featured
      api.get.mockResolvedValueOnce({ data: mockRecipes }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Quick Chicken Stir Fry')).toBeInTheDocument();
        expect(screen.getByText('Slow Beef Stew')).toBeInTheDocument();
      });

      // Click "Quick & Easy" filter
      const quickEasyBtn = screen.getByText(/Quick & Easy/i);
      fireEvent.click(quickEasyBtn);

      // Should only show the quick recipe
      await waitFor(() => {
        expect(screen.getByText('Quick Chicken Stir Fry')).toBeInTheDocument();
        expect(screen.queryByText('Slow Beef Stew')).not.toBeInTheDocument();
      });
    });

    test('should show all recipes when clicking All Recipes', async () => {
      const mockRecipes = [
        {
          id: 1,
          title: 'Quick Recipe',
          description: 'Fast',
          difficulty: 'easy',
          prep_time: 5,
          cook_time: 10
        },
        {
          id: 2,
          title: 'Slow Recipe',
          description: 'Slow',
          difficulty: 'medium',
          prep_time: 20,
          cook_time: 120
        }
      ];

      // Mock all three API calls
      api.get.mockResolvedValueOnce({ data: null }); // featured
      api.get.mockResolvedValueOnce({ data: mockRecipes }); // popular
      api.get.mockResolvedValueOnce({ data: [] }); // recent
      api.get.mockResolvedValueOnce({ data: [] }); // ingredients

      render(<HomePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Quick Recipe')).toBeInTheDocument();
        expect(screen.getByText('Slow Recipe')).toBeInTheDocument();
      });

      // Click "Quick & Easy" first to filter
      const quickEasyBtn = screen.getByText(/Quick & Easy/i);
      fireEvent.click(quickEasyBtn);

      // Should only show quick recipe
      await waitFor(() => {
        expect(screen.getByText('Quick Recipe')).toBeInTheDocument();
        expect(screen.queryByText('Slow Recipe')).not.toBeInTheDocument();
      });

      // Click "All Recipes" to show all
      const allRecipesBtn = screen.getByText(/All Recipes/i);
      fireEvent.click(allRecipesBtn);

      // Should show all recipes again
      await waitFor(() => {
        expect(screen.getByText('Quick Recipe')).toBeInTheDocument();
        expect(screen.getByText('Slow Recipe')).toBeInTheDocument();
      });
    });
  });
});
