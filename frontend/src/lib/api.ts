const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const handleResponse = async (response: Response) => {
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || 'API Error')
    ;(error as any).response = { status: response.status, data }
    throw error
  }
  return data
}

export const api = {

  get: (url: string) =>
    fetch(API_BASE + url).then(handleResponse),

  post: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(handleResponse),

  put: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(handleResponse),

  patch: (url: string, data: any) =>
    fetch(API_BASE + url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(handleResponse),

  delete: (url: string) =>
    fetch(API_BASE + url, { method: "DELETE" }).then(handleResponse)

}

/* ---------- Utilities ---------- */

export const rupee = (amount: number | string) => {
  return "₹" + Number(amount || 0).toLocaleString("en-IN")
}

export const fmtDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-IN")
}
