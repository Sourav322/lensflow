const API_BASE = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {

  get: (url: string, options?: RequestInit) =>
    fetch(API_BASE + url, {
      ...options,
      headers: { ...getAuthHeaders(), ...options?.headers }
    }).then(r => r.json()),

  post: (url: string, data: any, options?: RequestInit) =>
    fetch(API_BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
      body: JSON.stringify(data),
      ...options
    }).then(r => r.json()),

  put: (url: string, data: any, options?: RequestInit) =>
    fetch(API_BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
      body: JSON.stringify(data),
      ...options
    }).then(r => r.json()),

  patch: (url: string, data: any, options?: RequestInit) =>
    fetch(API_BASE + url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
      body: JSON.stringify(data),
      ...options
    }).then(r => r.json()),

  delete: (url: string, options?: RequestInit) =>
    fetch(API_BASE + url, {
      method: "DELETE",
      headers: { ...getAuthHeaders(), ...options?.headers },
      ...options
    }).then(r => r.json())

}

/* ---------- Utilities ---------- */

export const rupee = (amount: number | string) => {
  return "₹" + Number(amount || 0).toLocaleString("en-IN")
}

export const fmtDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-IN")
}
