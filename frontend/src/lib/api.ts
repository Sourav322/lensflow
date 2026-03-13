const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  })

  if (!res.ok) {
    throw new Error("API Error")
  }

  return res.json()
}

export const get = (path: string) => api(path)

export const post = (path: string, data: any) =>
  api(path, {
    method: "POST",
    body: JSON.stringify(data),
  })

export const put = (path: string, data: any) =>
  api(path, {
    method: "PUT",
    body: JSON.stringify(data),
  })

export const del = (path: string) =>
  api(path, {
    method: "DELETE",
  })

export const rupee = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`

export const fmtDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-IN")
