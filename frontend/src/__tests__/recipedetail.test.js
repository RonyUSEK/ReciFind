import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import RecipeDetailPage from '../pages/RecipeDetailPage';

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
}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false
  })
}));

const mockRecipeData = {
  id: 1,
  title: 'Spicy Garlic Shrimp Pasta',
  description: 'A quick and delicious pasta dish with garlic shrimp',
  chef_name: 'Chef Mario',
  chef_id: 2,
  prep_time: 15,
  cook_time: 20,
  servings: 4,
  difficulty: 'medium',
  cuisine: 'Italian',
  spice_level: 'medium',
  calories: 450,
  save_count: '12',
  status: 'approved',
  instructions: [
    'Boil water in a large pot and cook pasta according to package directions',
    'While pasta cooks, heat olive oil in a large pan over medium heat',
    'Add minced garlic and cook for 30 seconds until fragrant',
    'Add shrimp and cook for 3-4 minutes until pink and cooked through',
    'Drain pasta and add to the pan with shrimp',
    'Toss everything together and season with salt, pepper, and red pepper flakes',
    'Serve hot with fresh parsley on top'
  ],
  ingredients: [
    { name: 'Pasta', quantity: '400', unit: 'g' },
    { name: 'Shrimp', quantity: '500', unit: 'g' },
    { name: 'Garlic', quantity: '4', unit: 'cloves' },
    { name: 'Olive Oil', quantity: '3', unit: 'tbsp' },
    { name: 'Red Pepper Flakes', quantity: '1', unit: 'tsp' },
    { name: 'Fresh Parsley', quantity: '2', unit: 'tbsp' }
  ]
};

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    test('should show loading skeleton while fetching recipe', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Should show loading text or skeleton
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Recipe Display', () => {
    test('should fetch and display recipe details', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/api/recipes/1');
      });

      // Wait for content to load - check for something that definitely exists
      await waitFor(() => {
        const content = document.body.textContent;
        expect(content).toMatch(/Ingredients|Instructions/);
      }, { timeout: 3000 });
    });

    test('should display chef name', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Chef Mario/i)).toBeInTheDocument();
      });
    });

    test('should display recipe metadata', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for difficulty badge to appear
      await waitFor(() => {
        expect(screen.getByText('medium')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should display ingredients list', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for ingredients heading
      await waitFor(() => {
        expect(screen.getByText('Ingredients')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Check ingredient text
      const content = document.body.textContent;
      expect(content).toMatch(/Pasta/);
    });

    test('should display instruction steps', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for instructions heading
      await waitFor(() => {
        expect(screen.getByText('Instructions')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Check instruction text
      const content = document.body.textContent;
      expect(content).toMatch(/Boil water in a large pot/i);
    });

    test('should display save count', async () => {
      api.get.mockResolvedValueOnce({ data: mockRecipeData });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for save count to appear
      await waitFor(() => {
        const content = document.body.textContent;
        expect(content).toMatch(/12/);
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    test('should show 404 message when recipe not found', async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      render(
        <MemoryRouter initialEntries={['/recipe/999']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/recipe not found/i)).toBeInTheDocument();
      });
    });

    test('should show error message on API failure', async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 500 }
      });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load recipe/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Missing Data Handling', () => {
    test('should handle recipe with no ingredients gracefully', async () => {
      const recipeNoIngredients = {
        ...mockRecipeData,
        ingredients: []
      };

      api.get.mockResolvedValueOnce({ data: recipeNoIngredients });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Ingredients')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show "No ingredients listed"
      expect(screen.getByText(/no ingredients listed/i)).toBeInTheDocument();
    });

    test('should handle missing optional fields', async () => {
      const minimalRecipe = {
        id: 1,
        title: 'Simple Recipe',
        description: 'Test description',
        instructions: ['Step 1'],
        ingredients: [],
        save_count: '0',
        status: 'approved'
      };

      api.get.mockResolvedValueOnce({ data: minimalRecipe });

      render(
        <MemoryRouter initialEntries={['/recipe/1']}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for page sections to appear (should render without crashing)
      await waitFor(() => {
        expect(screen.getByText('Ingredients')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText('Instructions')).toBeInTheDocument();
    });
  });
});
