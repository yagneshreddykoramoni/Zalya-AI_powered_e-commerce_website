import axios from 'axios';

// Make sure this environment variable is set correctly in your .env file
// VITE_API_URL=http://localhost:5000/api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
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

// Add logging interceptor to debug requests
api.interceptors.request.use(
  (config) => {
    console.log(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response logging interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const productService = {
  // Get all products with filtering and pagination
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get a single product by ID
  getProductById: async (id) => {
    try {
      // Ensure id is a string
      let productId;
      if (typeof id === 'object') {
        if (id === null) {
          throw new Error('Product ID cannot be null');
        }
        // If it's an object with _id or id property, use that
        if (id._id) {
          productId = id._id;
        } else if (id.id) {
          productId = id.id;
        } else {
          // Last resort - stringify the object
          productId = JSON.stringify(id);
        }
      } else {
        productId = id;
      }
      
      console.log(`Fetching product with processed ID: ${productId}`);
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product with ID ${id}:`, error);
      throw error;
    }
  },

  // Get all categories
  getCategories: async () => {
    try {
      const response = await api.get('/products/categories/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get all brands
  getBrands: async () => {
    try {
      const response = await api.get('/products/brands/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching brands:', error);
      throw error;
    }
  },
  // Add a review to a product
  addReview: async (productId: string, reviewData: { rating: number, comment: string }) => {
    try {
      const response = await api.post(`/products/${productId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  },

  // Update review helpfulness
  updateReviewHelpfulness: async (productId: string, reviewId: string, isHelpful: boolean) => {
    try {
      const response = await api.put(
        `/products/${productId}/reviews/${reviewId}/helpfulness`, 
        { isHelpful }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating review helpfulness:', error);
      throw error;
    }
  },

  // Get reviews for a product
  getProductReviews: async (productId: string) => {
    try {
      const response = await api.get(`/products/${productId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  },
  // Get trending products based on real user analytics
  getTrendingProducts: async (params = {}) => {
    try {
      const response = await api.get('/products/trending', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching trending products:', error);
      throw error;
    }
  },  // Get personalized recommendations for the current user
  getPersonalizedRecommendations: async (params = {}) => {
    try {
      console.log('Fetching personalized recommendations with params:', params);
      const token = localStorage.getItem('token');
      console.log('Auth token present:', !!token);
      
      const response = await api.get('/products/recommendations/personalized', { params });
      
      console.log('Personalized recommendations response:', {
        status: response.status,
        personalized: response.data.personalized,
        count: (response.data.products || []).length,
        metadata: response.data.metadata
      });
      
      // Backend returns { products: [...], personalized: boolean, metadata: {...} }
      // Return just the products array for compatibility
      return response.data.products || response.data;
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
      throw error;
    }
  },
};

export default productService;