const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = {

  get: (url: string) =>
    fetch(API_BASE + url).then(r => r.json()),

  post: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  put: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  patch: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  delete: (url: string) =>
    fetch(API_BASE + url, { method: "DELETE" }).then(r => r.json())

}

/* ---------- Utilities ---------- */

export const rupee = (amount: number | string) => {
  return "₹" + Number(amount || 0).toLocaleString("en-IN")
}

export const fmtDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-IN")
}
