import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const authenticateWithSupabase = async (): Promise<boolean> => {
    try {
      const serviceEmail = import.meta.env.VITE_SERVICE_EMAIL;
      const servicePassword = import.meta.env.VITE_SERVICE_PASSWORD;

      if (!serviceEmail || !servicePassword) {
        console.error('Service credentials not configured');
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: serviceEmail,
        password: servicePassword,
      });

      if (error) {
        console.error('Supabase auth error:', error.message);
        return false;
      }

      if (data.session) {
        console.log('Supabase session established');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error authenticating with Supabase:', error);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const authStatus = sessionStorage.getItem('fym_portal_auth');

      if (authStatus === 'true') {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          setIsAuthenticated(true);
        } else {
          const success = await authenticateWithSupabase();
          setIsAuthenticated(success);
          if (!success) {
            sessionStorage.removeItem('fym_portal_auth');
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const validateCredentials = async (email: string, password: string): Promise<boolean> => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-portal-login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      return result.valid === true;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    const credentialsValid = await validateCredentials(email, password);
    if (!credentialsValid) {
      setIsLoading(false);
      return false;
    }

    const supabaseAuthSuccess = await authenticateWithSupabase();

    if (supabaseAuthSuccess) {
      setIsAuthenticated(true);
      sessionStorage.setItem('fym_portal_auth', 'true');
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fym_portal_auth');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
