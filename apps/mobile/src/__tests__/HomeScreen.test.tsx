import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import * as api from '../lib/api';
import { makeStoredUser, makeCheckinEvent } from './factories';

jest.mock('../lib/api');

const mockSignOut = jest.fn();
// Stable reference: useCallback([user]) won't recreate loadEvent on each re-render,
// which would re-call getTodayEvent and overwrite state mid-test.
const mockUser = makeStoredUser({ id: 'u1' });
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: mockSignOut }),
}));

const pendingEvent = makeCheckinEvent({ id: 'evt1', status: 'pending', respondedAt: null });
const completedEvent = makeCheckinEvent({
  id: 'evt1',
  status: 'completed',
  respondedAt: new Date('2026-06-25T09:05:00Z').toISOString(),
});

describe('HomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows greeting with user first name', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(null);
    await render(<HomeScreen />);
    const firstName = mockUser.fullName.split(' ')[0];
    expect(await screen.findByText(`Hi, ${firstName}!`)).toBeTruthy();
  });

  it('shows no-schedule card when no event exists', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(null);
    await render(<HomeScreen />);
    expect(await screen.findByText('No check-in scheduled today')).toBeTruthy();
  });

  it('shows check-in button for pending event', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(pendingEvent);
    await render(<HomeScreen />);
    expect(await screen.findByText("I'm OK")).toBeTruthy();
    expect(screen.getByText('Time for your daily check-in')).toBeTruthy();
  });

  it('marks check-in complete and shows success state', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(pendingEvent);
    jest.mocked(api.completeCheckin).mockResolvedValue(completedEvent);

    await render(<HomeScreen />);
    fireEvent.press(await screen.findByText("I'm OK"));

    await waitFor(() => expect(screen.getByText("You're checked in!")).toBeTruthy());
    expect(api.completeCheckin).toHaveBeenCalledWith('u1', 'evt1');
  });

  it('shows already-completed state', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(completedEvent);
    await render(<HomeScreen />);
    expect(await screen.findByText("You're checked in!")).toBeTruthy();
  });

  it('shows error banner when event load fails', async () => {
    jest.mocked(api.getTodayEvent).mockRejectedValue(new Error('Network error'));
    await render(<HomeScreen />);
    expect(await screen.findByText('Could not load check-in status.')).toBeTruthy();
  });

  it('shows error banner when check-in API fails', async () => {
    jest.mocked(api.getTodayEvent).mockResolvedValue(pendingEvent);
    jest.mocked(api.completeCheckin).mockRejectedValue(new Error('Server error'));

    await render(<HomeScreen />);
    fireEvent.press(await screen.findByText("I'm OK"));

    await waitFor(() => expect(screen.getByText('Check-in failed. Please try again.')).toBeTruthy());
  });
});
