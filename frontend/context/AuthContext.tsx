import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function createLocalSession(email: string, fullName?: string) {
  const user: AuthUser = {
    id: 'local-user',
    email,
    user_metadata: fullName ? { full_name: fullName } : {},
  };

  return {
    access_token: 'local-access-token',
    refresh_token: 'local-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as AuthSession;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const session = createLocalSession(email, fullName);
    setSession(session);
    setUser(session.user);
    setLoading(false);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const session = createLocalSession(email);
    setSession(session);
    setUser(session.user);
    setLoading(false);
    return { error: null };
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
