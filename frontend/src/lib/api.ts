const API_BASE = import.meta.env.VITE_API_URL

export async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  })

  return res.json()
}
