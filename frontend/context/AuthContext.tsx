import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser } from '@/lib/authApi';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
  userCode?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, username: string, password: string, retypePassword: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_STORAGE_KEY = 'krovaa.auth.session';

function createSession(token: string, user: AuthUser): AuthSession {
  return {
    access_token: token,
    refresh_token: token,
    expires_in: SESSION_TTL_MS / 1000,
    expires_at: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
    token_type: 'bearer',
    user,
  };
}

function isSessionValid(session: AuthSession) {
  return session.expires_at > Math.floor(Date.now() / 1000);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!storedSession) {
          return;
        }

        const parsedSession = JSON.parse(storedSession) as AuthSession;
        if (!isSessionValid(parsedSession)) {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }

        if (isMounted) {
          setSession(parsedSession);
          setUser(parsedSession.user);
        }
      } catch {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = async (nextSession: AuthSession | null) => {
    if (!nextSession) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  };

  const setAuthState = async (token: string, authUser: AuthUser) => {
    const nextSession = createSession(token, authUser);
    setSession(nextSession);
    setUser(authUser);
    await persistSession(nextSession);
  };

  const signUp = async (email: string, username: string, password: string, retypePassword: string) => {
    try {
      const { data, error } = await registerUser(email, username, password, retypePassword);
      if (error || !data) {
        return { error };
      }

      await setAuthState(data.token, data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unable to create account.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await loginUser(email, password);
      if (error || !data) {
        return { error };
      }

      await setAuthState(data.token, data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unable to sign in.' };
    }
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    await persistSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
