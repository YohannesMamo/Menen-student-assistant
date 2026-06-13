// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_URL = API_BASE_URL;

// Helper for fetch calls
export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });
};