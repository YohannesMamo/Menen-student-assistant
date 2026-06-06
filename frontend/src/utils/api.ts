// src/utils/api.ts
const API_BASE = '/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');   // or get from your AuthContext

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    // Optional: handle token expired → logout
    console.warn('Token expired or invalid');
    // You can call logout() from context here if you want
  }

  return response;
};