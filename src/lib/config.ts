// Get API base URL from server config (runtime)
// Falls back to build-time env var for local dev
async function getApiBaseUrl(): Promise<string> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Failed to fetch config');
    const { apiBaseUrl } = await response.json();
    if (apiBaseUrl) return apiBaseUrl;
  } catch (err) {
    console.warn('Failed to load runtime config:', err);
  }

  // Fallback to build-time env var (useful for local development)
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

export { getApiBaseUrl };
