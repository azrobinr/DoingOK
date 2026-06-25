import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import * as api from '../lib/api';
import { makeStoredUser } from './factories';

jest.mock('../lib/api');

const mockSignIn = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

const mockNav = { navigate: jest.fn() } as any;
const mockRoute = {} as any;
const user = userEvent.setup({ delay: null });

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders email, password fields and Log In button', async () => {
    await render(<LoginScreen navigation={mockNav} route={mockRoute} />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Log In')).toBeTruthy();
  });

  it('calls login API and signIn on success', async () => {
    const fakeUser = makeStoredUser({ email: 'test@example.com' });
    jest.mocked(api.login).mockResolvedValue({
      user: fakeUser,
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
    });

    await render(<LoginScreen navigation={mockNav} route={mockRoute} />);
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'Password1!');
    await user.press(screen.getByText('Log In'));

    expect(api.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password1!' });
    expect(mockSignIn).toHaveBeenCalledWith(
      'access-tok',
      'refresh-tok',
      expect.objectContaining({ email: 'test@example.com' })
    );
  });

  it('shows error message on login failure', async () => {
    jest.mocked(api.login).mockRejectedValue({ error: 'Invalid credentials' });

    await render(<LoginScreen navigation={mockNav} route={mockRoute} />);
    await user.type(screen.getByPlaceholderText('Email'), 'bad@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
    await user.press(screen.getByText('Log In'));

    expect(screen.getByText('Invalid credentials')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('falls back to generic error message when error has no message', async () => {
    jest.mocked(api.login).mockRejectedValue({});

    await render(<LoginScreen navigation={mockNav} route={mockRoute} />);
    await user.press(screen.getByText('Log In'));

    expect(screen.getByText('Login failed. Please try again.')).toBeTruthy();
  });

  it('navigates to Register when sign up link pressed', async () => {
    await render(<LoginScreen navigation={mockNav} route={mockRoute} />);
    await user.press(screen.getByText("Don't have an account? Sign up"));
    expect(mockNav.navigate).toHaveBeenCalledWith('Register');
  });
});
