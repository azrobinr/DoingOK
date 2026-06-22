import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveSession, getStoredSession, clearSession, StoredUser } from '../lib/storage';

interface AuthState {
  user: StoredUser | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken: string, user: StoredUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredSession()
      .then((session) => {
        if (session) setUser(session.user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function signIn(accessToken: string, refreshToken: string, user: StoredUser) {
    await saveSession(accessToken, refreshToken, user);
    setUser(user);
  }

  async function signOut() {
    await clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
