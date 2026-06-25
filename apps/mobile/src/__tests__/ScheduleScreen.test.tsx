import React from 'react';
import { Alert } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import ScheduleScreen from '../screens/ScheduleScreen';
import * as api from '../lib/api';
import { makeStoredUser, makeSchedule } from './factories';

jest.mock('../lib/api');

const mockUser = makeStoredUser({ id: 'u1' });
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockSchedule = makeSchedule({ id: 'sched1' });

const user = userEvent.setup({ delay: null });

describe('ScheduleScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders title and Save button after loading', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(mockSchedule);
    await render(<ScheduleScreen />);
    expect(await screen.findByText('Check-in Schedule')).toBeTruthy();
    expect(screen.getByText('Save Schedule')).toBeTruthy();
  });

  it('renders with no existing schedule (create path)', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(null);
    await render(<ScheduleScreen />);
    expect(await screen.findByText('Save Schedule')).toBeTruthy();
  });

  it('calls updateSchedule when an existing schedule is saved', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(mockSchedule);
    jest.mocked(api.updateSchedule).mockResolvedValue(mockSchedule);
    jest.spyOn(Alert, 'alert');

    await render(<ScheduleScreen />);
    await user.press(await screen.findByText('Save Schedule'));

    expect(api.updateSchedule).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ frequency: 'daily', scheduledHour: 9 })
    );
    expect(api.createSchedule).not.toHaveBeenCalled();
  });

  it('calls createSchedule when no schedule exists', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(null);
    jest.mocked(api.createSchedule).mockResolvedValue(mockSchedule);
    jest.spyOn(Alert, 'alert');

    await render(<ScheduleScreen />);
    await user.press(await screen.findByText('Save Schedule'));

    expect(api.createSchedule).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ frequency: 'daily' })
    );
    expect(api.updateSchedule).not.toHaveBeenCalled();
  });

  it('shows confirmation alert after save', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(mockSchedule);
    jest.mocked(api.updateSchedule).mockResolvedValue(mockSchedule);
    jest.spyOn(Alert, 'alert');

    await render(<ScheduleScreen />);
    await user.press(await screen.findByText('Save Schedule'));

    expect(Alert.alert).toHaveBeenCalledWith('Saved', expect.any(String));
  });

  it('shows error banner when schedule load fails', async () => {
    jest.mocked(api.getSchedule).mockRejectedValue({ error: 'Network error' });
    await render(<ScheduleScreen />);
    expect(await screen.findByText('Could not load schedule.')).toBeTruthy();
  });

  it('shows error banner when save fails', async () => {
    jest.mocked(api.getSchedule).mockResolvedValue(mockSchedule);
    jest.mocked(api.updateSchedule).mockRejectedValue({ error: 'Save failed' });

    await render(<ScheduleScreen />);
    fireEvent.press(await screen.findByText('Save Schedule'));

    await waitFor(() => expect(screen.getByText('Save failed')).toBeTruthy());
  });
});
