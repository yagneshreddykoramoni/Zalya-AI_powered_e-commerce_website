import React, { useState, useEffect, useCallback } from 'react';
import { getUserOrders } from '@/services/orderService';
import { useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, ArrowRight, ShoppingCart, ImageOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Order as UiOrder } from '@/lib/types';
import type { Order as ServiceOrder } from '@/services/orderService';
import { getImageUrl } from '@/lib/utils';

const OrderHistory = () => {
  const { user, isAuthenticated, addToCart } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  // In the fetchOrders function
  const fetchOrders = useCallback(async () => {
      setIsLoading(true);
      setError(null);
    try {
      if (isAuthenticated && user?.id) {
        const response = await getUserOrders();
        if (response?.success) {
          const mappedOrders: UiOrder[] = (response.orders || []).map((order: ServiceOrder) => ({
            id: order.id,
            userId: '',
            items: order.items,
            status: order.status,
            total: order.total,
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            createdAt: order.createdAt,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress,
          }));
          setOrders(mappedOrders);
        } else {
          throw new Error('Failed to load orders data');
        }
      }
    } catch (error) {
      const err = error as { message?: string };
      console.error('Failed to fetch orders:', err);
      setError(err.message ?? 'Failed to load orders');
      toast({
        title: "Error",
        description: err.message ?? "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast, user?.id]);

  // Single useEffect for fetching and setting up interval
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchOrders();
    }

    // Set up interval for periodic updates
    const intervalId = setInterval(() => {
      if (isAuthenticated && user?.id) {
        fetchOrders();
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, user?.id, fetchOrders]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => 
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleReorder = async (e: React.MouseEvent, order: UiOrder) => {
    e.stopPropagation();
    try {
      for (const item of order.items) {
        await addToCart(
          {
            ...item.product,
            description: '', // Add required fields with default values
            category: '',
            brand: '',
            rating: 0,
            reviewCount: 0,
            stock: 1,
            createdAt: new Date().toISOString()
          },
          item.quantity,
          item.selectedSize,
          item.selectedColor
        );
      }
      toast({
        title: "Items Added to Cart",
        description: "All items from this order have been added to your cart."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add items to cart",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-10 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Order History</h1>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-6 w-1/4 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-10 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Order History</h1>
            <Card className="bg-white">
              <CardContent className="py-10">
                <div className="text-center">
                  <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-4">Unable to load your orders</h3>
                  <p className="text-gray-500 mb-6">We're experiencing some technical difficulties. Please try again later.</p>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const handleImageError = (key: string) => {
    setImageErrors(prev => ({
      ...prev,
      [key]: true
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-10 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Order History</h1>
          
          <div className="mb-6">
            <Tabs defaultValue="all" onValueChange={setStatusFilter}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="shipped">Shipped</TabsTrigger>
                  <TabsTrigger value="delivered">Delivered</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
                
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              
              {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {statusFilter === 'all' && searchTerm === '' 
                          ? "You haven't placed any orders yet"
                          : "No orders match your criteria"}
                      </h3>
                      <Button onClick={() => navigate('/products')}>
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.map((order) => (
                        <Card 
                          key={order.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleOrderClick(order.id)}
                        >
                          <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                              <CardTitle className="text-base font-medium flex items-center gap-3">
                                Order #{order.id.substring(0, 8)}
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Placed on {new Date(order.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={(e) => handleReorder(e, order)}
                              >
                                <ShoppingCart size={14} />
                                <span className="hidden sm:inline">Reorder</span>
                              </Button>
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                              <div className="flex flex-wrap gap-3">
                                {order.items.slice(0, 3).map((item, idx) => {
                                  const imageKey = `${order.id}-${idx}`;
                                  return (
                                    <div key={imageKey} className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded overflow-hidden">
                                        {item.product?.images?.[0] && !imageErrors[imageKey] ? (
                                          <img 
                                            src={getImageUrl(item.product.images[0])} 
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                            onError={() => handleImageError(imageKey)}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <ImageOff className="text-gray-400" size={24} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <p className="font-medium">{item.product.name}</p>
                                        <p className="text-gray-500">
                                          Qty: {item.quantity} · ₹{(item.product.discountPrice || item.product.price).toFixed(2)}
                                          {item.selectedSize && ` · Size: ${item.selectedSize}`}
                                          {item.selectedColor && ` · Color: ${item.selectedColor}`}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {order.items.length > 3 && (
                                  <div className="text-sm text-brand-600">
                                    +{order.items.length - 3} more items
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right mt-2 md:mt-0">
                                <p className="text-lg font-bold">₹{order.total.toFixed(2)}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-sm flex items-center gap-1 ml-auto text-brand-600"
                                >
                                  View Details <ArrowRight size={14} />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderHistory;