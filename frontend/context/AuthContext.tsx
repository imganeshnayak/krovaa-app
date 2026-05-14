import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loginUser, registerUser } from '@/lib/authApi';

interface AuthUser {
  id: string;
  email: string;
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
  signUp: (email: string, password: string, retypePassword: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function createSession(token: string, user: AuthUser): AuthSession {
  return {
    access_token: token,
    refresh_token: token,
    expires_in: 60 * 60 * 24 * 7,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    token_type: 'bearer',
    user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const setAuthState = (token: string, authUser: AuthUser) => {
    const nextSession = createSession(token, authUser);
    setSession(nextSession);
    setUser(authUser);
  };

  const signUp = async (email: string, password: string, retypePassword: string) => {
    try {
      const { data, error } = await registerUser(email, password, retypePassword);
      if (error || !data) {
        return { error };
      }

      setAuthState(data.token, data.user);
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

      setAuthState(data.token, data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unable to sign in.' };
    }
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
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
