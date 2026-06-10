// src/utils/api.ts
let baseUrl = import.meta.env.VITE_API_URL || '';

// Clean up any trailing slashes automatically
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1);
}

export const API_BASE_URL = baseUrl;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const absoluteUrl = `${API_BASE_URL}${formattedEndpoint}`;
  
  // Auto-inject your state tokens from localStorage
  const token = localStorage.getItem('token'); 
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(absoluteUrl, { ...options, headers });
};
