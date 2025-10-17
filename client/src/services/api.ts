import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://zalya-backend.onrender.com/api');

export const API_BASE_URL = BASE_URL;

console.log('API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable sending cookies with cross-origin requests
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect for 401 errors, let the components handle it
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error.response?.data?.message || error.message);
  }
);

export const login = async (email: string, password: string, loginType: 'user' | 'admin' = 'user') => {
  const endpoint = loginType === 'admin' ? '/auth/admin/login' : '/auth/login';
  const { data } = await api.post(endpoint, { email, password });
  return data;
};

export const register = async (userData: {
  name: string;
  email: string;
  password: string;
}) => {
  const { data } = await api.post('/auth/register', {
    ...userData,
    registrationDate: new Date().toISOString(),
  });
  return data;
};

export const updateProfile = async (updates: Partial<{
  name: string;
  email: string;
  preferences: object;
}>) => {
  const { data } = await api.put('/auth/profile', updates);
  return data;
};

export const updateProfilePicture = async (formData: FormData) => {
  const { data } = await api.post('/auth/profile/picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export default api;