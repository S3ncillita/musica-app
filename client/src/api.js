import { getApiBase } from './config.js';

const API = getApiBase();

export async function api(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers });
}

export { API };
