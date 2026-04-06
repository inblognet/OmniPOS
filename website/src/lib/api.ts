import axios from "axios";

const api = axios.create({
  // ✅ Dynamically switches between Localhost and Render
  // Next.js uses process.env.NEXT_PUBLIC_ instead of import.meta.env
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://omnipos-backend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Optional: If you ever add customer logins to the website, this interceptor handles the token
api.interceptors.request.use(
  (config) => {
    // In Next.js, we have to make sure we are running in the browser before accessing localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("omnipos_customer_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;