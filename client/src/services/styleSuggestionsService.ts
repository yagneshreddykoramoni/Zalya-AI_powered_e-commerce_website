import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
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

const styleSuggestionsService = {
  // Get style suggestion for a specific product
  getProductStyleSuggestion: async (productId: string) => {
    if (!productId) {
      throw new Error('Product ID is required to fetch style suggestions');
    }

    try {
      const response = await api.get(`/style-suggestions/product/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product style suggestion:', error);
      throw error;
    }
  },

  // Get style suggestions (with cache)
  getStyleSuggestions: async () => {
    try {
      const response = await api.get('/style-suggestions');
      return response.data;
    } catch (error) {
      console.error('Error fetching style suggestions:', error);
      throw error;
    }
  },

  // Force refresh suggestions
  refreshStyleSuggestions: async () => {
    try {
      const response = await api.post('/style-suggestions/refresh');
      return response.data;
    } catch (error) {
      console.error('Error refreshing style suggestions:', error);
      throw error;
    }
  },
};

export default styleSuggestionsService;
