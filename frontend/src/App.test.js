/**
 * ReciFind Homepage Tests
 * 
 * Test Driven Development (TDD) Approach:
 * These tests describe WHAT the homepage should do, written as if the features already exist.
 * In true TDD, you would write these BEFORE implementing the features.
 * 
 * Test Structure:
 * - describe() blocks group related tests
 * - test() or it() blocks test individual behaviors
 * - expect() assertions verify the behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('ReciFind Homepage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ========================================
  // SECTION 1: INITIAL RENDER & STRUCTURE
  // ========================================
  describe('Initial Page Load', () => {
    test('should render the ReciFind logo', () => {
      render(<App />);
      expect(screen.getByText('Reci')).toBeInTheDocument();
      expect(screen.getByText('Find')).toBeInTheDocument();
    });

    test('should render the main heading', () => {
      render(<App />);
      expect(screen.getByText(/What's Cooking Today?/i)).toBeInTheDocument();
    });

    test('should render the tagline', () => {
      render(<App />);
      expect(screen.getByText(/Find recipes based on the ingredients you already have/i)).toBeInTheDocument();
    });

    test('should render the search input with placeholder', () => {
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);
      expect(searchInput).toBeInTheDocument();
    });

    test('should render the Search button', () => {
      render(<App />);
      const searchButtons = screen.getAllByRole('button', { name: /search/i });
      expect(searchButtons.length).toBeGreaterThan(0);
    });

    test('should render Login button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    test('should render dark mode toggle button', () => {
      render(<App />);
      expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // SECTION 2: QUICK TOGGLE INGREDIENTS
  // ========================================
  describe('Quick Toggle Ingredient Buttons', () => {
    test('should render all 5 quick toggle ingredients', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /beef/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cheese/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /eggs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /potatoes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /veggies/i })).toBeInTheDocument();
    });

    test('should add ingredient when quick toggle is clicked', async () => {
      render(<App />);
      const beefButton = screen.getByRole('button', { name: /beef/i });
      
      fireEvent.click(beefButton);
      
      // Ingredient should appear as a pill in the search bar with "toggle" in aria-label
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle beef/i })).toBeInTheDocument();
      });
    });

    test('should toggle ingredient to exclude mode on second click', async () => {
      render(<App />);
      const cheeseButton = screen.getByRole('button', { name: /cheese/i });
      
      // First click - include
      fireEvent.click(cheeseButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle cheese/i })).toBeInTheDocument();
      });

      // Second click - exclude (should show minus sign)
      fireEvent.click(cheeseButton);
      await waitFor(() => {
        const pill = screen.getByRole('button', { name: /toggle cheese/i });
        expect(pill).toHaveTextContent('−');
      });
    });

    test('should remove ingredient on third click', async () => {
      render(<App />);
      const eggsButton = screen.getByRole('button', { name: /eggs/i });
      
      // Click 1: include
      fireEvent.click(eggsButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle eggs/i })).toBeInTheDocument();
      });

      // Click 2: exclude
      fireEvent.click(eggsButton);
      
      // Click 3: remove
      fireEvent.click(eggsButton);
      
      // Eggs pill should not be in search bar anymore
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /toggle eggs/i })).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // SECTION 3: SEARCH INPUT & AUTOCOMPLETE
  // ========================================
  describe('Search Input & Autocomplete', () => {
    test('should show autocomplete dropdown when typing', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'chi');

      await waitFor(() => {
        expect(screen.getByText('Chicken')).toBeInTheDocument();
      });
    });

    test('should filter suggestions based on input', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'bas');

      await waitFor(() => {
        expect(screen.getByText('Basil')).toBeInTheDocument();
      });
    });

    test('should add ingredient when clicking suggestion', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'tom');
      
      await waitFor(() => {
        expect(screen.getByText('Tomato')).toBeInTheDocument();
      });

      const tomatoButton = screen.getByText('Tomato');
      fireEvent.click(tomatoButton);

      // Should add Tomato pill to search bar
      await waitFor(() => {
        const pills = screen.getAllByText('Tomato');
        expect(pills.length).toBeGreaterThan(0);
      });
    });

    test('should allow adding custom ingredient not in suggestions', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'paprika');

      await waitFor(() => {
        expect(screen.getByText(/Add "paprika"/i)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/Add "paprika"/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Paprika')).toBeInTheDocument();
      });
    });

    test('should clear search input after adding ingredient', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'salt');
      
      await waitFor(() => {
        expect(screen.getByText('Salt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Salt'));

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  // ========================================
  // SECTION 4: KEYBOARD NAVIGATION
  // ========================================
  describe('Keyboard Navigation', () => {
    test('should navigate suggestions with arrow down key', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'on');

      // Press arrow down
      await user.keyboard('{ArrowDown}');

      // First suggestion should be highlighted (has ring styling)
      await waitFor(() => {
        const suggestions = screen.getByText(/Add "on"/i).closest('button');
        expect(suggestions).toHaveClass('ring-2');
      });
    });

    test('should add ingredient with Enter key on selected suggestion', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'gar');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}'); // Select Garlic
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Garlic')).toBeInTheDocument();
      });
    });

    test('should close autocomplete with Escape key', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'milk');
      
      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  // ========================================
  // SECTION 5: INGREDIENT PILLS
  // ========================================
  describe('Ingredient Pills in Search Bar', () => {
    test('should display ingredient pill after adding', async () => {
      render(<App />);
      const beefButton = screen.getByRole('button', { name: /beef/i });
      
      fireEvent.click(beefButton);

      await waitFor(() => {
        const pill = screen.getByRole('button', { name: /toggle beef/i });
        expect(pill).toHaveClass('ingredient-tag');
      });
    });

    test('should show plus icon for included ingredients', async () => {
      render(<App />);
      const cheeseButton = screen.getByRole('button', { name: /cheese/i });
      
      fireEvent.click(cheeseButton);

      await waitFor(() => {
        const pill = screen.getByRole('button', { name: /toggle cheese/i });
        expect(pill).toHaveTextContent('+');
      });
    });

    test('should toggle to exclude mode when clicking pill', async () => {
      render(<App />);
      const eggsButton = screen.getByRole('button', { name: /eggs/i });
      
      fireEvent.click(eggsButton);

      // Click the pill to toggle
      const pill = await screen.findByRole('button', { name: /toggle eggs/i });
      fireEvent.click(pill);

      await waitFor(() => {
        const updatedPill = screen.getByRole('button', { name: /toggle eggs/i });
        expect(updatedPill).toHaveTextContent('−');
      });
    });

    test('should remove ingredient when toggling through exclude', async () => {
      render(<App />);
      const potatoesButton = screen.getByRole('button', { name: /potatoes/i });
      
      fireEvent.click(potatoesButton);

      const pill = await screen.findByRole('button', { name: /toggle potatoes/i });
      
      // Toggle to exclude
      fireEvent.click(pill);
      
      // Toggle to remove
      const excludePill = await screen.findByRole('button', { name: /toggle potatoes/i });
      fireEvent.click(excludePill);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /toggle potatoes/i })).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // SECTION 6: SEARCH FUNCTIONALITY
  // ========================================
  describe('Search Functionality', () => {
    test('should show alert when clicking search with ingredients', async () => {
      // Mock window.alert
      window.alert = jest.fn();
      
      render(<App />);
      
      // Add an ingredient
      const beefButton = screen.getByRole('button', { name: /beef/i });
      fireEvent.click(beefButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle beef/i })).toBeInTheDocument();
      });

      // Click search
      const searchButtons = screen.getAllByRole('button', { name: /search/i });
      fireEvent.click(searchButtons[0]);

      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Beef'));
    });

    test('should show alert when clicking search without ingredients', async () => {
      window.alert = jest.fn();
      
      render(<App />);
      
      const searchButtons = screen.getAllByRole('button', { name: /search/i });
      fireEvent.click(searchButtons[0]);

      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('select at least one ingredient'));
    });

    test('should trigger search with Enter key when ingredients present', async () => {
      window.alert = jest.fn();
      const user = userEvent.setup();
      
      render(<App />);
      
      // Add ingredient
      const cheeseButton = screen.getByRole('button', { name: /cheese/i });
      fireEvent.click(cheeseButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle cheese/i })).toBeInTheDocument();
      });

      // Press Enter in search input (use id since placeholder is empty when ingredients are active)
      const searchInput = document.getElementById('recipe-search');
      searchInput.focus();
      await user.keyboard('{Enter}');

      expect(window.alert).toHaveBeenCalled();
    });
  });

  // ========================================
  // SECTION 7: DARK MODE
  // ========================================
  describe('Dark Mode Toggle', () => {
    test('should toggle dark mode when clicking theme button', async () => {
      render(<App />);
      const themeButton = screen.getByLabelText(/toggle dark mode/i);

      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });
    });

    test('should save theme preference to localStorage', async () => {
      render(<App />);
      const themeButton = screen.getByLabelText(/toggle dark mode/i);

      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });

    test('should load saved theme from localStorage on mount', () => {
      localStorage.setItem('theme', 'dark');
      
      render(<App />);

      expect(document.documentElement).toHaveClass('dark');
    });

    test('should toggle between light and dark modes', async () => {
      render(<App />);
      const themeButton = screen.getByLabelText(/toggle dark mode/i);

      // Toggle to dark
      fireEvent.click(themeButton);
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });

      // Toggle back to light
      fireEvent.click(themeButton);
      await waitFor(() => {
        expect(document.documentElement).not.toHaveClass('dark');
      });
    });
  });

  // ========================================
  // SECTION 8: RECIPE DISPLAYS
  // ========================================
  describe('Recipe Display', () => {
    test('should render Recipe of the Day section', () => {
      render(<App />);
      expect(screen.getByText(/One-Pan Honey-Garlic Salmon/i)).toBeInTheDocument();
    });

    test('should display recipe rating', () => {
      render(<App />);
      expect(screen.getByText(/4.8/i)).toBeInTheDocument();
      expect(screen.getByText(/1,230 Reviews/i)).toBeInTheDocument();
    });

    test('should render Recommended Recipes section', () => {
      render(<App />);
      expect(screen.getByText(/Recommended Recipes/i)).toBeInTheDocument();
    });

    test('should display all 4 recommended recipe cards', () => {
      render(<App />);
      expect(screen.getByText(/Spicy Beef Tacos/i)).toBeInTheDocument();
      expect(screen.getByText(/Creamy Lemon Pasta/i)).toBeInTheDocument();
      expect(screen.getByText(/Coconut Chicken Curry/i)).toBeInTheDocument();
      expect(screen.getByText(/Flourless Chocolate Cake/i)).toBeInTheDocument();
    });

    test('should display match percentages on recipe cards', () => {
      render(<App />);
      expect(screen.getByText(/90%/i)).toBeInTheDocument();
      expect(screen.getByText(/95%/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/i)).toBeInTheDocument();
      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // SECTION 9: FILTER TABS
  // ========================================
  describe('Recipe Filter Tabs', () => {
    test('should render all filter category buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /quick & easy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /high protein/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vegetarian/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /desserts/i })).toBeInTheDocument();
    });

    test('should have Quick & Easy filter active by default', () => {
      render(<App />);
      const quickEasyButton = screen.getByRole('button', { name: /quick & easy/i });
      expect(quickEasyButton).toHaveClass('bg-green-600');
    });
  });

  // ========================================
  // SECTION 10: FOOTER
  // ========================================
  describe('Footer', () => {
    test('should render copyright information', () => {
      render(<App />);
      expect(screen.getByText(/© 2024 ReciFind. All rights reserved./i)).toBeInTheDocument();
    });

    test('should render footer links', () => {
      render(<App />);
      expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // SECTION 11: SUGGESTED INGREDIENT
  // ========================================
  describe('Suggested Ingredient (Basil)', () => {
    test('should show "Suggest: Basil" button when Basil is not active', () => {
      render(<App />);
      // On desktop, suggestion should be visible
      expect(screen.queryByText(/Suggest: Basil/i)).toBeInTheDocument();
    });

    test('should hide Basil suggestion after adding it', async () => {
      render(<App />);
      
      // Add Basil through quick suggestion
      const basilSuggestion = screen.getByText(/Suggest: Basil/i);
      fireEvent.click(basilSuggestion);

      await waitFor(() => {
        expect(screen.queryByText(/Suggest: Basil/i)).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // SECTION 12: ACCESSIBILITY
  // ========================================
  describe('Accessibility', () => {
    test('should have proper ARIA labels for buttons', () => {
      render(<App />);
      expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
    });

    test('should have accessible search input', () => {
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    test('should show keyboard navigation hints in autocomplete', async () => {
      const user = userEvent.setup();
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/e.g., chicken, basil/i);

      await user.type(searchInput, 'salt');

      await waitFor(() => {
        expect(screen.getByText(/Use ↑↓ arrows to navigate/i)).toBeInTheDocument();
      });
    });
  });
});
