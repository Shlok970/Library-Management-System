import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Add interceptor to include token in all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
