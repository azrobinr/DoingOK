// Lightweight API client for the DoingOK backend.
//
// Base URL comes from VITE_API_URL (see .env.example); defaults to the local
// Fastify dev server. Tokens are persisted in localStorage so a session
// survives page reloads. `authedFetch` transparently refreshes an expired
// access token once before giving up.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ACCESS_KEY = 'doingok.accessToken';
const REFRESH_KEY = 'doingok.refreshToken';
const USER_KEY = 'doingok.user';

// --- token / session storage ------------------------------------------------

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession({ user, accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// --- low-level request helper -----------------------------------------------

// Throws an Error whose `.message` is the server's error string (when present)
// and `.status` is the HTTP status code, so callers can branch on either.
async function request(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Could not reach the server. Please try again.');
    err.status = 0;
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// --- auth endpoints ----------------------------------------------------------

export async function register({ email, password, fullName, phone, timezone }) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, phone, timezone },
  });
  saveSession(data);
  return data;
}

export async function login({ email, password }) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  saveSession(data);
  return data;
}

export async function acceptTos(version) {
  return request('/auth/accept-tos', {
    method: 'POST',
    body: { version },
    token: getAccessToken(),
  });
}

export async function logout() {
  const token = getAccessToken();
  try {
    if (token) await request('/auth/logout', { method: 'POST', token });
  } finally {
    clearSession();
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { accessToken } = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    localStorage.setItem(ACCESS_KEY, accessToken);
    return accessToken;
  } catch {
    clearSession();
    return null;
  }
}

// --- authenticated requests --------------------------------------------------

// Use for any protected endpoint. Retries once with a refreshed token on 401.
export async function authedFetch(path, options = {}) {
  try {
    return await request(path, { ...options, token: getAccessToken() });
  } catch (err) {
    if (err.status !== 401) throw err;
    const newToken = await refreshAccessToken();
    if (!newToken) throw err;
    return request(path, { ...options, token: newToken });
  }
}

export const isAuthenticated = () => Boolean(getAccessToken());
