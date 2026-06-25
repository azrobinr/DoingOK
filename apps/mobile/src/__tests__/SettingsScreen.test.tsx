import React from 'react';
import { Alert } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';
import * as api from '../lib/api';
import { makeStoredUser, makeUserProfile } from './factories';

jest.mock('../lib/api');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockSignOut = jest.fn();
const mockUser = makeStoredUser({ id: 'u1' });
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: mockSignOut }),
}));

const mockProfile = makeUserProfile({
  id: 'u1',
  email: mockUser.email,
  fullName: mockUser.fullName,
  displayName: 'Tester',
  phone: '+15005550000',
  timezone: 'America/New_York',
});

// delay:null prevents userEvent.type from leaking setTimeout timers between tests
const user = userEvent.setup({ delay: null });

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.getUser).mockResolvedValue(mockProfile);
  });

  it('shows user name and email in header', async () => {
    await render(<SettingsScreen />);
    expect(await screen.findByText(mockUser.fullName)).toBeTruthy();
    expect(screen.getByText(mockUser.email)).toBeTruthy();
  });

  it('populates profile fields from API response', async () => {
    await render(<SettingsScreen />);
    expect(await screen.findByDisplayValue('Tester')).toBeTruthy();
    expect(screen.getByDisplayValue('+15005550000')).toBeTruthy();
  });

  it('saves profile and shows confirmation', async () => {
    jest.mocked(api.updateProfile).mockResolvedValue(mockProfile);
    jest.spyOn(Alert, 'alert');

    await render(<SettingsScreen />);
    // user.press flushes the async updateProfile call via act()
    await user.press(await screen.findByText('Save Profile'));

    expect(Alert.alert).toHaveBeenCalledWith('Saved', expect.any(String));
    expect(api.updateProfile).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ displayName: 'Tester', phone: '+15005550000', timezone: 'America/New_York' })
    );
  });

  it('shows error when profile save fails', async () => {
    jest.mocked(api.updateProfile).mockRejectedValue({ error: 'Server error' });

    await render(<SettingsScreen />);
    fireEvent.press(await screen.findByText('Save Profile'));

    await waitFor(() => expect(screen.getByText('Server error')).toBeTruthy());
  });

  it('navigates to Schedule when row pressed', async () => {
    await render(<SettingsScreen />);
    await user.press(await screen.findByText('Check-in Schedule'));
    expect(mockNavigate).toHaveBeenCalledWith('Schedule');
  });

  it('reveals password form when Change Password pressed', async () => {
    await render(<SettingsScreen />);
    // user.press flushes the setShowPassword(true) state update via act()
    await user.press(await screen.findByText('Change Password'));
    expect(screen.getByPlaceholderText('Current password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Repeat new password')).toBeTruthy();
  });

  it('rejects mismatched passwords without calling API', async () => {
    await render(<SettingsScreen />);
    await user.press(await screen.findByText('Change Password'));

    await user.type(screen.getByPlaceholderText('Current password'), 'OldPass1!');
    await user.type(
      screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'),
      'NewPass1!'
    );
    await user.type(screen.getByPlaceholderText('Repeat new password'), 'DifferentPass1!');
    await user.press(screen.getByText('Update Password'));

    expect(screen.getByText('New passwords do not match.')).toBeTruthy();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('calls changePassword when passwords match', async () => {
    jest.mocked(api.changePassword).mockResolvedValue(undefined);

    await render(<SettingsScreen />);
    await user.press(await screen.findByText('Change Password'));

    await user.type(screen.getByPlaceholderText('Current password'), 'OldPass1!');
    await user.type(
      screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'),
      'NewPass1!'
    );
    await user.type(screen.getByPlaceholderText('Repeat new password'), 'NewPass1!');
    await user.press(screen.getByText('Update Password'));

    expect(api.changePassword).toHaveBeenCalledWith('u1', 'OldPass1!', 'NewPass1!');
  });

  it('hides password form after successful password change', async () => {
    jest.mocked(api.changePassword).mockResolvedValue(undefined);

    await render(<SettingsScreen />);
    await user.press(await screen.findByText('Change Password'));

    await user.type(screen.getByPlaceholderText('Current password'), 'OldPass1!');
    await user.type(
      screen.getByPlaceholderText('Min 8 chars, uppercase, number, symbol'),
      'NewPass1!'
    );
    await user.type(screen.getByPlaceholderText('Repeat new password'), 'NewPass1!');
    await user.press(screen.getByText('Update Password'));

    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Current password')).toBeNull()
    );
  });

  it('calls signOut when sign out is confirmed', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = (buttons as any[])?.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    await render(<SettingsScreen />);
    await screen.findByText('Sign Out');
    fireEvent.press(screen.getByText('Sign Out'));

    expect(mockSignOut).toHaveBeenCalled();
  });
});
