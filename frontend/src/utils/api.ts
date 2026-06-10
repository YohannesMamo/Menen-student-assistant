// src/utils/api.ts
let baseUrl = import.meta.env.VITE_API_URL || '';

// Automatically strip trailing slashes once for the entire application lifecycle
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1);
}

export const API_BASE_URL = baseUrl;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Ensure the endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Combine into an absolute URL automatically
  const absoluteUrl = `${API_BASE_URL}${formattedEndpoint}`;
  
  // Automatically inject common headers like JSON content type and authorization tokens
  const token = localStorage.getItem('token'); // Adjust key to match your auth system
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(absoluteUrl, { ...options, headers });
};
