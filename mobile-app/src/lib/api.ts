import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omnipos-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('mobile_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add device info for mobile
    config.headers['X-Device-Type'] = 'mobile';
    const deviceId = localStorage.getItem('device_id');
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mobile_token');
        localStorage.removeItem('mobile_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
