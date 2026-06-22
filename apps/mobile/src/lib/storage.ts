import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'doingok.accessToken',
  refreshToken: 'doingok.refreshToken',
  user: 'doingok.user',
} as const;

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
}

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: StoredUser
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
  ]);
}

export async function getStoredSession(): Promise<{
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
} | null> {
  const [accessToken, refreshToken, userJson] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.user),
  ]);

  if (!accessToken || !refreshToken || !userJson) return null;

  try {
    return { accessToken, refreshToken, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
