// Ping the backend every 4 minutes to prevent Render free-tier cold starts.
// Called once from App.tsx on mount.

const PING_URL = (import.meta.env.VITE_API_URL || 'https://smartcitizenreportingsystem.onrender.com/api/v1') + '/ping/'
const PING_INTERVAL_MS = 4 * 60 * 1000 // 4 minutes

let started = false

export function startKeepAlive() {
  if (started) return
  started = true

  const ping = () => {
    fetch(PING_URL, { method: 'GET', mode: 'cors' }).catch(() => {})
  }

  // Ping immediately on load to wake the server
  ping()
  setInterval(ping, PING_INTERVAL_MS)
}
