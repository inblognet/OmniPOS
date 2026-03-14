import axios from 'axios';

const axiosInstance = axios.create({
  // ✅ Live Render Production Backend
  baseURL: 'https://omnipos-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

export default axiosInstance;