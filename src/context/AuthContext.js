// src/context/AuthContext.js
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; 

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: async () => ({ error: null }),
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInitialUser = async () => {
      try {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        setUser(verifiedUser);

        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
      } catch (error) {
        console.error('Initial auth check failed:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false); 
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Login error:', error.message);
      return { error: error.message || 'Invalid credentials' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error.message);
      return { error: error.message || 'Logout failed' };
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
