import axios from 'axios';

const axiosInstance = axios.create({
  // ✅ NEW PORT: 5500
  baseURL: 'http://localhost:5500/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

export default axiosInstance;