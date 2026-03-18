import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string; name: string; email: string;
  role: 'admin' | 'staff' | 'optometrist';
  shopId: string; shopName: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, at: string, rt: string) => void;
  setAccessToken: (t: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('authToken', accessToken);
        set({ user, accessToken, refreshToken });
      },
      setAccessToken: (accessToken) => {
        localStorage.setItem('authToken', accessToken);
        set({ accessToken });
      },
      logout: () => {
        localStorage.removeItem('authToken');
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: 'lensflow-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);
