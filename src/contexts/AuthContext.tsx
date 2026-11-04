import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Portal staff auth — containment PR (2026-11-04).
 *
 * The old flow validated the shared portal password (validate-portal-login)
 * and then signed EVERYONE in as the shared service account using
 * VITE_SERVICE_EMAIL / VITE_SERVICE_PASSWORD baked into the bundle. That path
 * is deleted: the staff-login edge function now validates the same portal
 * password server-side and mints a PER-PERSON session (app_metadata.kind =
 * 'staff') for the email the staff member entered. No service credentials
 * exist client-side, so service@teamfym.com's password can be rotated without
 * touching this app (FYM-App edge fns keep using PORTAL_SERVICE_* secrets).
 */

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Agency portal sessions (kind 'agency') must never pass the staff gate. */
const isStaffSession = (kind: unknown): boolean => kind !== 'agency';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(
        !!data.session && isStaffSession(data.session.user.app_metadata?.kind),
      );
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.access_token || !result.refresh_token) {
        return false;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error || !data.session) {
        console.error('Could not establish the portal session:', error?.message);
        return false;
      }

      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fym_portal_auth'); // legacy flag cleanup
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
