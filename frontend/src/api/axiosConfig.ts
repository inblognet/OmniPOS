import axios from 'axios';

const axiosInstance = axios.create({
  // ✅ Dynamically switches between Localhost (Dev) and Render (Production)
  baseURL: import.meta.env.VITE_API_URL || 'https://omnipos-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  }
  // ❌ DELETED: withCredentials: true (This breaks Electron CORS!)
});

// ✅ Request Interceptor to attach the JWT token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Grab the token we saved during login
    const token = localStorage.getItem('omnipos_token');

    // 2. If it exists, attach it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor to handle expired tokens
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend kicks us out (401 Unauthorized), force a logout
    if (error.response && error.response.status === 401) {
      console.warn("Token expired or invalid. Logging out...");

      // Clear the invalid data
      localStorage.removeItem('omnipos_token');
      localStorage.removeItem('omnipos_user');

      // Redirect back to the login screen (using HashRouter format for Electron)
      window.location.href = '#/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;