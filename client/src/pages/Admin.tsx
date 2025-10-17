import React, { useState, useEffect } from 'react';
import AdminNavBar from '@/components/admin/AdminNavBar';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Users, Package, Settings, Trash2, Edit, User, Plus, Heart, ShoppingCart, CreditCard, UserPlus, LogIn, Activity as ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RecommendationMonitor from '@/components/admin/RecommendationMonitor';
import ProductForm from '@/components/admin/ProductForm';
import { Product } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { getImageUrl } from '@/lib/utils';
import api from '@/services/api';
import { 
  getDashboardSummary,
  getRecentActivities,
  getUsers,
  deleteUser,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAnalytics,
  getSalesMetrics,
  getUserMetrics
} from '@/services/adminService';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type RecentActivity = {
  _id: string;
  type: string;
  message: string;
  user?: {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  product?: {
    _id: string;
    name?: string;
  };
  order?: {
    _id: string;
    totalAmount?: number;
    paymentDisplayName?: string;
  };
  details?: Record<string, unknown>;
  createdAt: string;
};

type IconComponent = typeof ActivityIcon;

const defaultActivityIconConfig = {
  Icon: ActivityIcon as IconComponent,
  bg: 'bg-gray-100',
  color: 'text-gray-600',
  label: 'Activity'
};

const activityIconConfig: Record<string, typeof defaultActivityIconConfig> = {
  wishlist: { Icon: Heart, bg: 'bg-pink-100', color: 'text-pink-600', label: 'Wishlist' },
  cart: { Icon: ShoppingCart, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Cart' },
  purchase: { Icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600', label: 'Purchase' },
  order: { Icon: Package, bg: 'bg-orange-100', color: 'text-orange-600', label: 'Order' },
  product_update: { Icon: Package, bg: 'bg-purple-100', color: 'text-purple-600', label: 'Product Update' },
  user_registration: { Icon: UserPlus, bg: 'bg-indigo-100', color: 'text-indigo-600', label: 'New User' },
  login: { Icon: LogIn, bg: 'bg-slate-100', color: 'text-slate-600', label: 'Login' },
  user_update: { Icon: Users, bg: 'bg-amber-100', color: 'text-amber-600', label: 'User Update' }
};

const getActivityVisuals = (type: string) => activityIconConfig[type] || defaultActivityIconConfig;

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(undefined);
  
  // State for data from API
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    productCount: 0,
    userCount: 0,
    pendingOrdersCount: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState({
    dashboard: true,
    users: true,
    products: true,
    activities: true,
    analytics: true
  });
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 0,
    salesGrowth: 0,
    avgOrderValue: 0,
    activeUsers: 0,
    newSignups: 0,
    userGrowth: 0
  });

  // Real analytics chart data state
  const [salesTrendData, setSalesTrendData] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [revenueBreakdownData, setRevenueBreakdownData] = useState([]);

  const isAdmin = isAuthenticated && user?.role === 'admin';
  const shouldRedirect = !isAdmin;

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format date
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)} days ago`;
    }
  };

  const capitalize = (value: string) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

  const buildActivityDetails = (activity: RecentActivity) => {
  const detailBadges: string[] = [];
  const detailData: Record<string, unknown> = activity.details ?? {};

    const actorName = activity.user?.name;
    if (actorName) {
      detailBadges.push(`Actor: ${actorName}`);
    }

    const roleFromDetails = typeof detailData.role === 'string' ? detailData.role : undefined;
    const resolvedRole = roleFromDetails || activity.user?.role;
    if (resolvedRole) {
      detailBadges.push(`Role: ${capitalize(resolvedRole)}`);
    }

    const email = typeof detailData.email === 'string' ? detailData.email : activity.user?.email;
    if (email) {
      detailBadges.push(`Email: ${email}`);
    }

    const productName = typeof detailData.productName === 'string'
      ? detailData.productName
      : activity.product?.name;
    if (productName) {
      detailBadges.push(`Product: ${productName}`);
    }

    const quantity = typeof detailData.quantity === 'number' ? detailData.quantity : undefined;
    if (typeof quantity === 'number' && quantity > 0) {
      detailBadges.push(`Quantity: ${quantity}`);
    }

    const size = typeof detailData.selectedSize === 'string' ? detailData.selectedSize : undefined;
    if (size) {
      detailBadges.push(`Size: ${size}`);
    }

    const color = typeof detailData.selectedColor === 'string' ? detailData.selectedColor : undefined;
    if (color) {
      detailBadges.push(`Color: ${color}`);
    }

    const paymentMethod = typeof detailData.paymentMethod === 'string'
      ? detailData.paymentMethod
      : activity.order?.paymentDisplayName;
    if (paymentMethod) {
      detailBadges.push(`Payment: ${paymentMethod}`);
    }

    const totalFromDetails = typeof detailData.totalAmount === 'number' ? detailData.totalAmount : undefined;
    const totalFromOrder = typeof activity.order?.totalAmount === 'number' ? activity.order.totalAmount : undefined;
    const resolvedTotal = totalFromDetails ?? totalFromOrder;
    if (typeof resolvedTotal === 'number' && !Number.isNaN(resolvedTotal) && resolvedTotal > 0) {
      detailBadges.push(`Total: ${formatCurrency(resolvedTotal)}`);
    }

    const itemCount = typeof detailData.itemCount === 'number' ? detailData.itemCount : undefined;
    if (typeof itemCount === 'number' && itemCount > 0) {
      detailBadges.push(`Items: ${itemCount}`);
    }

    const newStatus = typeof detailData.newStatus === 'string' ? detailData.newStatus : undefined;
    if (newStatus) {
      detailBadges.push(`Status: ${capitalize(newStatus)}`);
    }

    const action = typeof detailData.action === 'string' ? detailData.action : undefined;
    if (action && !['added'].includes(action)) {
      detailBadges.push(`Action: ${capitalize(action)}`);
    }

    return detailBadges;
  };

  // API call functions for analytics
  const fetchAnalyticsData = async () => {
    try {
      const { data } = await api.get('/admin/analytics');
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  };

  const fetchSalesMetrics = async () => {
    try {
      const { data } = await api.get('/admin/analytics/sales');
      return data;
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      throw error;
    }
  };

  const fetchUserMetrics = async () => {
    try {
      const { data } = await api.get('/admin/analytics/users');
      return data;
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      throw error;
    }
  };

  const fetchSalesTrend = async () => {
    try {
      const { data } = await api.get('/admin/analytics/sales-trend');
      return data.salesTrend;
    } catch (error) {
      console.error('Error fetching sales trend:', error);
      throw error;
    }
  };

  const fetchUserActivity = async () => {
    try {
      const { data } = await api.get('/admin/analytics/user-activity');
      return data.userActivity;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  };

  const fetchOrderStatus = async () => {
    try {
      const { data } = await api.get('/admin/analytics/order-status');
      return data.orderStatus;
    } catch (error) {
      console.error('Error fetching order status:', error);
      throw error;
    }
  };

  const fetchSalesByCategory = async () => {
    try {
      const { data } = await api.get('/admin/analytics/sales-by-category');

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.categorySales)) {
        return data.categorySales;
      }

      return [];
    } catch (error) {
      console.error('Error fetching sales by category:', error);
      throw error;
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const data = await getDashboardSummary();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(prev => ({ ...prev, dashboard: false }));
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  // Fetch recent activities
  useEffect(() => {
    if (!isAdmin || activeTab !== 'dashboard') {
      return;
    }

    const fetchActivities = async () => {
      try {
        const data = await getRecentActivities();
        const rawActivities = Array.isArray(data) ? (data as RecentActivity[]) : [];
        const normalizedActivities = rawActivities.map((activity) => ({
          ...activity,
          details: activity.details ?? {},
          createdAt: activity.createdAt ?? new Date().toISOString()
        }));
        setActivities(normalizedActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: 'Error',
          description: 'Failed to load recent activities',
          variant: 'destructive'
        });
      } finally {
        setLoading(prev => ({ ...prev, activities: false }));
      }
    };

    fetchActivities();
  }, [isAdmin, activeTab]);

  // Fetch users when users tab is active
  useEffect(() => {
    if (!isAdmin || activeTab !== 'users') {
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(prev => ({ ...prev, users: true }));
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive'
        });
      } finally {
        setLoading(prev => ({ ...prev, users: false }));
      }
    };

    fetchUsers();
  }, [isAdmin, activeTab]);

  // Fetch products when products tab is active
  useEffect(() => {
    if (!isAdmin || activeTab !== 'products') {
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(prev => ({ ...prev, products: true }));
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive'
        });
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    fetchProducts();
  }, [isAdmin, activeTab]);

  // Fetch real analytics data
  useEffect(() => {
    if (!isAdmin || activeTab !== 'analytics') {
      return;
    }

    const fetchRealAnalyticsData = async () => {
      try {
        setLoading(prev => ({ ...prev, analytics: true }));
        
        // Fetch all analytics data in parallel
  const [_analytics, salesMetrics, userMetrics, salesTrend, userActivity, orderStatus, salesByCategory] = await Promise.all([
          fetchAnalyticsData(),
          fetchSalesMetrics(),
          fetchUserMetrics(),
          fetchSalesTrend(),
          fetchUserActivity(),
          fetchOrderStatus(),
          fetchSalesByCategory()
        ]);
        
        // Update analytics summary data
        setAnalyticsData({
          totalSales: salesMetrics.totalRevenue || 0,
          salesGrowth: salesMetrics.growth || 0,
          avgOrderValue: salesMetrics.averageOrder || 0,
          activeUsers: userMetrics.active || 0,
          newSignups: userMetrics.newSignups || 0,
          userGrowth: userMetrics.growth || 0
        });

        // Update chart data with real data
        setSalesTrendData(salesTrend || []);
        setUserActivityData(userActivity || []);
        setOrderStatusData(orderStatus || []);
        setRevenueBreakdownData(salesByCategory || []);
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive'
        });
        
        // Fallback to empty data
        setAnalyticsData({
          totalSales: 0,
          salesGrowth: 0,
          avgOrderValue: 0,
          activeUsers: 0,
          newSignups: 0,
          userGrowth: 0
        });
        setSalesTrendData([]);
        setUserActivityData([]);
        setOrderStatusData([]);
        setRevenueBreakdownData([]);
      } finally {
        setLoading(prev => ({ ...prev, analytics: false }));
      }
    };

    fetchRealAnalyticsData();
  }, [isAdmin, activeTab]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditUserDialog(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { data: updatedUser } = await api.put(`/admin/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email
      });
      setUsers(users.map(u => u._id === editingUser._id ? updatedUser : u));
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setShowEditUserDialog(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = (userId) => {
    setSelectedUserId(userId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUserId) return;
    
    try {
      await deleteUser(selectedUserId);
      setUsers(users.filter(user => user._id !== selectedUserId));
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedUserId(null);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p._id !== productId));
      toast({
        title: "Product deleted",
        description: "The product has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  const handleProductFormSubmit = async (productData) => {
    try {
      if (editingProduct) {
        const updatedProduct = await updateProduct(editingProduct._id, productData);
        setProducts(products.map(p => p._id === editingProduct._id ? updatedProduct : p));
        toast({
          title: "Product updated",
          description: "The product has been successfully updated.",
        });
      } else {
        const newProduct = await createProduct(productData);
        setProducts([...products, newProduct]);
        toast({
          title: "Product added",
          description: "The product has been successfully added to catalog.",
        });
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive'
      });
    } finally {
      setShowProductForm(false);
      setEditingProduct(undefined);
    }
  };

  if (shouldRedirect) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AdminNavBar />
      
      <main className="flex-grow p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full max-w-4xl">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users size={16} />
                Users
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package size={16} />
                Products
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart size={16} />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Settings size={16} />
                Recommendations
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Products</h2>
                  <div className="text-4xl font-bold text-purple-600">
                    {loading.dashboard ? 'Loading...' : dashboardData.productCount}
                  </div>
                  <p className="text-gray-500 mt-2">Total active products</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Users</h2>
                  <div className="text-4xl font-bold text-indigo-600">
                    {loading.dashboard ? 'Loading...' : dashboardData.userCount}
                  </div>
                  <p className="text-gray-500 mt-2">Registered users</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Orders</h2>
                  <div className="text-4xl font-bold text-green-600">
                    {loading.dashboard ? 'Loading...' : dashboardData.pendingOrdersCount}
                  </div>
                  <p className="text-gray-500 mt-2">Orders pending</p>
                </div>
              </div>
              
              <div className="mt-8 bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                </div>
                <ScrollArea className="h-80">
                  <div className="p-6">
                    {loading.activities ? (
                      <div className="text-center py-10">Loading activities...</div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">No recent activities found</div>
                    ) : (
                      <div className="space-y-6">
                        {activities.map((activity, index) => {
                          const { Icon, bg, color, label } = getActivityVisuals(activity.type);
                          const detailBadges = buildActivityDetails(activity);

                          return (
                            <div key={activity._id || index} className="flex items-start gap-4">
                              <div className={`${bg} rounded-full p-2`} aria-label={label}>
                                <Icon className={`h-5 w-5 ${color}`} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{activity.message}</p>
                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                                  {formatTime(activity.createdAt)}
                                </p>
                                {detailBadges.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                    {detailBadges.map((detail) => (
                                      <span
                                        key={detail}
                                        className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1"
                                      >
                                        {detail}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage user accounts. Total users: {dashboardData.userCount}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Orders
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loading.users ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">Loading users...</td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No users found</td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user._id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{user.orders?.length || 0}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="inline-flex items-center gap-1"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit size={14} />
                                  Edit
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="inline-flex items-center gap-1"
                                  onClick={() => handleDeleteUser(user._id)}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>
                      Manage your product catalog. Total products: {dashboardData.productCount}
                    </CardDescription>
                  </div>
                  <Button className="flex items-center gap-1" onClick={handleAddProduct}>
                    <Plus size={16} />
                    Add Product
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loading.products ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">Loading products...</td>
                          </tr>
                        ) : products.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No products found</td>
                          </tr>
                        ) : (
                          products.map((product) => (
                            <tr key={product._id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    {product.images && product.images.length > 0 ? (
                                      <img
                                        className="h-10 w-10 rounded-md object-cover"
                                        src={getImageUrl(product.images[0])}
                                        alt={`${product.name} thumbnail`}
                                        loading="lazy"
                                        onError={(event) => {
                                          const target = event.currentTarget;
                                          target.onerror = null;
                                          target.src = '/placeholder.svg';
                                        }}
                                      />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                    <div className="text-sm text-gray-500">{product.brand}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {product.discountPrice ? (
                                  <div>
                                    <div className="text-sm text-gray-900">₹{product.discountPrice.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500 line-through">₹{product.price.toFixed(2)}</div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-900">₹{product.price.toFixed(2)}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{product.stock}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="inline-flex items-center gap-1"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit size={14} />
                                  Edit
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="inline-flex items-center gap-1"
                                  onClick={() => handleDeleteProduct(product._id)}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {loading.analytics ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading real-time analytics data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Real-time Status Header */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live Analytics Dashboard</span>
                      <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Trigger manual refresh of analytics data
                        const event = new CustomEvent('refreshAnalytics');
                        window.dispatchEvent(event);
                      }}
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Data
                    </Button>
                  </div>

                  {/* Key Performance Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-bl-full opacity-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.totalSales)}</p>
                            <div className={`flex items-center text-sm ${analyticsData.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <svg className={`w-4 h-4 mr-1 ${analyticsData.salesGrowth >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              {Math.abs(analyticsData.salesGrowth)}% vs last month
                            </div>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-full">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-bl-full opacity-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Active Users</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.activeUsers.toLocaleString()}</p>
                            <div className={`flex items-center text-sm ${analyticsData.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <svg className={`w-4 h-4 mr-1 ${analyticsData.userGrowth >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              {Math.abs(analyticsData.userGrowth)}% vs last week
                            </div>
                          </div>
                          <div className="p-3 bg-green-100 rounded-full">
                            <Users className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-bl-full opacity-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.avgOrderValue)}</p>
                            <div className={`flex items-center text-sm ${analyticsData.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <svg className={`w-4 h-4 mr-1 ${analyticsData.salesGrowth >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              {Math.abs(analyticsData.salesGrowth)}% vs last month
                            </div>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-full">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-bl-full opacity-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">New Signups</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.newSignups.toLocaleString()}</p>
                            <div className={`flex items-center text-sm ${analyticsData.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <svg className={`w-4 h-4 mr-1 ${analyticsData.userGrowth >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              {Math.abs(analyticsData.userGrowth)}% vs last week
                            </div>
                          </div>
                          <div className="p-3 bg-orange-100 rounded-full">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Real-time Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Trend Chart */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Sales Trend</CardTitle>
                          <CardDescription>Revenue over the last 30 days</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>Live</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesTrendData}>
                              <defs>
                                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `₹${value / 1000}K`}
                              />
                              <Tooltip 
                                formatter={(value) => [formatCurrency(value), 'Sales']}
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Area 
                                type="monotone"
                                dataKey="sales"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#salesGradient)"
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* User Activity Chart */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">User Activity</CardTitle>
                          <CardDescription>Daily active users and signups</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Live</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={userActivityData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                              />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip 
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="activeUsers" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                name="Active Users"
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="newSignups" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                name="New Signups"
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="returning" 
                                stroke="#8b5cf6" 
                                strokeWidth={2}
                                name="Returning Users"
                                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#8b5cf6', strokeWidth: 2, fill: 'white' }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Revenue by Category Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue by Category</CardTitle>
                        <CardDescription>Top performing product categories</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={revenueBreakdownData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis 
                                type="number" 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `₹${value / 1000}K`}
                              />
                              <YAxis 
                                dataKey="category" 
                                type="category" 
                                width={100}
                                tick={{ fontSize: 12 }}
                              />
                              <Tooltip 
                                formatter={(value) => [formatCurrency(value), 'Revenue']}
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Bar 
                                dataKey="revenue" 
                                fill="#3b82f6"
                                radius={[0, 4, 4, 0]}
                              />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Order Status Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Order Status Distribution</CardTitle>
                        <CardDescription>Current order status breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80 flex items-center">
                          <div className="w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={orderStatusData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {orderStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-1/2 pl-4">
                            <div className="space-y-3">
                              {orderStatusData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">{entry.value}</div>
                                    <div className="text-xs text-gray-500">
                                      {((entry.value / orderStatusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Real-time Activity Feed */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Live Activity Feed</CardTitle>
                        <CardDescription>Real-time business activities and events</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        <span className="text-sm text-gray-500">Live Updates</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {activities.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>No recent activities</p>
                              <p className="text-sm">Activity will appear here when users interact with your platform</p>
                            </div>
                          ) : (
                            activities.map((activity, index) => {
                              const { Icon, bg, color, label } = getActivityVisuals(activity.type);
                              const detailBadges = buildActivityDetails(activity);

                              return (
                                <div
                                  key={activity._id || index}
                                  className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`} aria-label={label}>
                                      <Icon className={`w-5 h-5 ${color}`} />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">{formatTime(activity.createdAt)}</p>
                                    {detailBadges.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                                        {detailBadges.map((detail) => (
                                          <span
                                            key={`${activity._id}-detail-${detail}`}
                                            className="inline-flex items-center rounded-full bg-white px-2 py-0.5 shadow-sm"
                                          >
                                            {detail}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" aria-hidden="true"></div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <RecommendationMonitor />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user's information here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleEditUserSubmit(e);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <input
                  id="name"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={editingUser?.name || ''}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  className="w-full p-2 border rounded-md"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditUserDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'Update the product information in the catalog' 
                : 'Fill in the details to add a new product to the catalog'
              }
            </DialogDescription>
          </DialogHeader>
          <ProductForm 
            initialData={editingProduct} 
            onSubmit={handleProductFormSubmit}
            onCancel={() => setShowProductForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;