import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 5000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pos-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      console.error('POS system warning: ', error.response.data.error);
    }
    return Promise.reject(error);
  }
);

export default api;
