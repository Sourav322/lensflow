const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const api = {
  async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error("API error")
    return res.json()
  },

  async post(path: string, data: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("API error")
    return res.json()
  },

  async put(path: string, data: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("API error")
    return res.json()
  },

  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("API error")
    return res.json()
  },
}

export const rupee = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`

export const fmtDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-IN")
