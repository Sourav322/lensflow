import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: BASE });

// ── Request: attach bearer token ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
    if (!refreshToken) { logout(); return Promise.reject(err); }

    if (refreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    refreshing = true;
    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
      const newToken = data.data.accessToken;
      setAccessToken(newToken);
      queue.forEach((cb) => cb(newToken));
      queue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      logout();
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
export const rupee = (n: unknown) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const uid = () => Math.random().toString(36).slice(2, 9);
