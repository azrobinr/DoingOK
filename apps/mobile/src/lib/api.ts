import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('doingok.accessToken');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('doingok.refreshToken');
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const { accessToken } = await res.json();
  await SecureStore.setItemAsync('doingok.accessToken', accessToken);
  return accessToken;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();

  const makeRequest = (t: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
        ...(init.headers ?? {}),
      },
    });

  let res = await makeRequest(token!);

  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await makeRequest(fresh);
  }

  return res;
}

// --- Auth ---

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  timezone?: string;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function login(data: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function logout(userId: string) {
  await authedFetch('/auth/logout', { method: 'POST' });
}

export async function acceptTos(version: string) {
  const res = await authedFetch('/auth/accept-tos', {
    method: 'POST',
    body: JSON.stringify({ version }),
  });
  if (!res.ok && res.status !== 409) throw await res.json();
}

// --- Check-ins ---

export async function getTodayEvent(userId: string) {
  const res = await authedFetch(
    `/users/${userId}/checkin-events?status=pending&limit=1`
  );
  if (!res.ok) throw await res.json();
  const events = await res.json();
  return events[0] ?? null;
}

export async function completeCheckin(userId: string, eventId: string, notes?: string) {
  const res = await authedFetch(
    `/users/${userId}/checkin-events/${eventId}/complete`,
    { method: 'POST', body: JSON.stringify({ notes: notes ?? '' }) }
  );
  if (!res.ok) throw await res.json();
  return res.json();
}

// --- Contacts ---

export interface Contact {
  id: string;
  fullName: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  priorityOrder: number;
  notifyViaSms: boolean;
  notifyViaEmail: boolean;
  notifyViaCall: boolean;
  isActive: boolean;
}

export async function getContacts(userId: string): Promise<Contact[]> {
  const res = await authedFetch(`/users/${userId}/contacts`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function createContact(
  userId: string,
  data: Omit<Contact, 'id' | 'isActive'>
): Promise<Contact> {
  const res = await authedFetch(`/users/${userId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function updateContact(
  userId: string,
  contactId: string,
  data: Partial<Omit<Contact, 'id'>>
): Promise<Contact> {
  const res = await authedFetch(`/users/${userId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function deleteContact(userId: string, contactId: string): Promise<void> {
  const res = await authedFetch(`/users/${userId}/contacts/${contactId}`, { method: 'DELETE' });
  if (!res.ok) throw await res.json();
}

// --- Schedule ---

export interface Schedule {
  id: string;
  frequency: string;
  scheduledHour: number;
  windowMinutes: number;
  escalationDelayMinutes: number;
  isActive: boolean;
}

export async function getSchedule(userId: string): Promise<Schedule | null> {
  const res = await authedFetch(`/users/${userId}/checkin-schedule`);
  if (res.status === 404) return null;
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function createSchedule(
  userId: string,
  data: Omit<Schedule, 'id'>
): Promise<Schedule> {
  const res = await authedFetch(`/users/${userId}/checkin-schedule`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function updateSchedule(
  userId: string,
  data: Partial<Omit<Schedule, 'id'>>
): Promise<Schedule> {
  const res = await authedFetch(`/users/${userId}/checkin-schedule`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// --- User profile ---

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  phone: string | null;
  timezone: string;
  isPaused: boolean;
  pausedAt: string | null;
}

export async function getUser(userId: string): Promise<UserProfile> {
  const res = await authedFetch(`/users/${userId}`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; phone?: string; timezone?: string }
): Promise<UserProfile> {
  const res = await authedFetch(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await authedFetch(`/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw await res.json();
}

export async function pauseCheckins(userId: string): Promise<{ isPaused: boolean; pausedAt: string }> {
  const res = await authedFetch(`/users/${userId}/pause`, { method: 'POST' });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function resumeCheckins(userId: string): Promise<{ isPaused: boolean; pausedAt: null }> {
  const res = await authedFetch(`/users/${userId}/resume`, { method: 'POST' });
  if (!res.ok) throw await res.json();
  return res.json();
}

// --- Push tokens ---

export async function registerPushToken(userId: string, token: string, platform: 'ios' | 'android') {
  const res = await authedFetch(`/users/${userId}/push-tokens`, {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
  // 409 = already registered, treat as success
  if (!res.ok && res.status !== 409) throw await res.json();
}
