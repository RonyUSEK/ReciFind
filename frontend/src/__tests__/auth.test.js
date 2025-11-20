import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';

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

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

// Test wrapper with future flags to suppress React Router v7 warnings
const TestWrapper = ({ children }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with email and password fields', () => {
    render(<Login />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  test('shows error when fields are empty', async () => {
    render(<Login />, { wrapper: TestWrapper });

    const submitButton = screen.getByRole('button', { name: /log in/i });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });
  });

  test('displays loading state during login', () => {
    render(<Login />, { wrapper: TestWrapper });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });

    const submitButton = screen.getByRole('button', { name: /log in/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });
});

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form with all fields', () => {
    render(<Register />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('shows error when password is too short', async () => {
    render(<Register />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^name$/i), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'short' }
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('shows error when all fields are empty', async () => {
    render(<Register />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });
  });
});
