import { create } from 'zustand';
import { apiClient } from '../services/apiClient';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mfaEnabled: boolean;
  createdAt: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  user: UserProfile;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  setAuthModalOpen: (open: boolean) => void;
  setError: (err: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('nextmail_token'),
  isAuthenticated: !!localStorage.getItem('nextmail_token'),
  isAuthModalOpen: false,
  isLoading: false,
  error: null,

  setAuthModalOpen: (open) => set({ isAuthModalOpen: open, error: null }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      if (res.data?.accessToken) {
        localStorage.setItem('nextmail_token', res.data.accessToken);
        localStorage.setItem('nextmail_refresh_token', res.data.refreshToken);
        set({
          token: res.data.accessToken,
          user: res.data.user,
          isAuthenticated: true,
          isAuthModalOpen: false,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: 'Login failed: No access token received' });
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthResponse>('/auth/google', { idToken });
      if (res.data?.accessToken) {
        localStorage.setItem('nextmail_token', res.data.accessToken);
        localStorage.setItem('nextmail_refresh_token', res.data.refreshToken);
        set({
          token: res.data.accessToken,
          user: res.data.user,
          isAuthenticated: true,
          isAuthModalOpen: false,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: 'Google login failed: No access token received' });
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, fullName });
      if (res.data?.accessToken) {
        localStorage.setItem('nextmail_token', res.data.accessToken);
        localStorage.setItem('nextmail_refresh_token', res.data.refreshToken);
        set({
          token: res.data.accessToken,
          user: res.data.user,
          isAuthenticated: true,
          isAuthModalOpen: false,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: 'Registration failed' });
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration error';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('nextmail_refresh_token') || '';
    try {
      await apiClient.post(`/auth/logout?refreshToken=${encodeURIComponent(refreshToken)}`);
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('nextmail_token');
      localStorage.removeItem('nextmail_refresh_token');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const res = await apiClient.get<UserProfile>('/auth/me');
      if (res.data) {
        set({ user: res.data, isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem('nextmail_token');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
