import api from './api';

// Dashboard data
export const getDashboardSummary = async () => {
  const response = await api.get('/admin/dashboard/summary');
  return response.data;
};

export const getRecentActivities = async () => {
  const response = await api.get('/admin/activities');
  return response.data;
};

// User operations
export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

// Product operations
export const getProducts = async () => {
  const response = await api.get('/admin/products');
  return response.data;
};

export const createProduct = async (productData: FormData) => {
  const response = await api.post('/admin/products', productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateProduct = async (productId: string, productData: FormData) => {
  const response = await api.put(`/admin/products/${productId}`, productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteProduct = async (productId: string) => {
  const response = await api.delete(`/admin/products/${productId}`);
  return response.data;
};

// Order operations
export const getOrders = async () => {
  const response = await api.get('/admin/orders');
  return response.data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const response = await api.put(`/admin/orders/${orderId}/status`, { status });
  return response.data;
};

// Analytics operations
export const getAnalytics = async () => {
  const response = await api.get('/admin/analytics');
  return response.data;
};

export const getSalesMetrics = async () => {
  const response = await api.get('/admin/analytics/sales');
  return response.data;
};

export const getUserMetrics = async () => {
  const response = await api.get('/admin/analytics/users');
  return response.data;
};

export const getSalesTrend = async () => {
  try {
    const response = await api.get('/admin/analytics/sales-trend');
    return response.data.salesTrend;
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    throw error;
  }
};

export const getUserActivity = async () => {
  try {
    const response = await api.get('/admin/analytics/user-activity');
    return response.data.userActivity;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
};

export const getOrderStatus = async () => {
  try {
    const response = await api.get('/admin/analytics/order-status');
    return response.data.orderStatus;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
};

export const getSalesByCategory = async () => {
  try {
    const response = await api.get('/admin/analytics/sales-by-category');
    return response.data.categorySales;
  } catch (error) {
    console.error('Error fetching sales by category:', error);
    throw error;
  }
};

export const getRecommendationMetrics = async () => {
  try {
    const response = await api.get('/admin/analytics/recommendations');
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendation metrics:', error);
    throw error;
  }
};