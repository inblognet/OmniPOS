import axios from 'axios';

export const api = axios.create({
  // ✅ Must be 5001
  baseURL: 'http://localhost:5001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});