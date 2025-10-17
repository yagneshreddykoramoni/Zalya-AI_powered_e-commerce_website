// OrderDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderDetails } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageOff } from 'lucide-react';
import { 
  ArrowLeft, 
  Download, 
  Package, 
  MapPin, 
  Clock, 
  CreditCard,
  Truck,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Order } from '@/lib/types';
import { getImageUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

const OrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { addToCart } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    
    const fetchOrderDetails = async () => {
      if (!orderId) {
        navigate('/orders');
        return;
      }

      try {
        const response = await getOrderDetails(orderId);
        if (!response.success || !response.order) {
          throw new Error('Order not found');
        }
        setOrder(response.order);
      } catch (error) {
        const err = error as { name?: string } | undefined;
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch order:', error);
          toast({
            title: "Error",
            description: "Failed to load order details",
            variant: "destructive"
          });
          navigate('/orders');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
    
    return () => {
      controller.abort();
    };
  }, [orderId, navigate, toast]);

  const handleDownloadInvoice = () => {
    if (!order?.id) {
      return;
    }
    // Trigger browser print dialog
    window.print();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Loading order details...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not found state
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center p-8">
                <Package size={48} className="text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">The order you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => navigate('/orders')} className="flex items-center gap-2">
                  <ArrowLeft size={16} />
                  Return to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Invalid order items state
  if (!order.items || !Array.isArray(order.items)) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/orders')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Orders
            </Button>
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex flex-col items-center p-4">
                  <Package size={32} className="text-gray-400 mb-4" />
                  <p className="text-gray-600 text-center">This order contains no items or has invalid data.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock size={16} />;
      case 'processing': return <Package size={16} />;
      case 'shipped': return <Truck size={16} />;
      case 'delivered': return <CheckCircle size={16} />;
      case 'cancelled': return <div className="w-4 h-4 rounded-full bg-current"></div>;
      default: return <Package size={16} />;
    }
  };
  
  // Calculate values
  const subtotal = order.items.reduce(
    (sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity), 
    0
  );
  
  const taxAmount = order.total - subtotal > 0 ? order.total - subtotal : subtotal * 0.18;
  const orderNumber = order._id?.substring(0, 8) || 'Unknown';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Handler for image errors
  const handleImageError = (key: string) => {
    setImageErrors(prev => ({
      ...prev,
      [key]: true
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              aria-label="Back to orders"
            >
              <ArrowLeft size={16} />
              <span>Back to Orders</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge className={`px-3 py-1 flex items-center gap-1 font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
              </Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Order #{orderNumber}</h1>
                <p className="text-gray-500 flex items-center gap-1">
                  <Clock size={14} />
                  <span>Placed on {orderDate}</span>
                </p>
              </div>
              
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button 
                  variant="default" 
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-2"
                  aria-label="Print invoice"
                >
                  <Download size={16} />
                  <span>Print Invoice</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 text-gray-800">
                  <CreditCard size={18} />
                  <h3 className="font-semibold">Payment Info</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-medium capitalize">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium text-emerald-600">Paid</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 text-gray-800">
                  <Truck size={18} />
                  <h3 className="font-semibold">Shipping Info</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Carrier:</span>
                    <span className="font-medium">Standard Delivery</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tracking:</span>
                    <span className="font-medium text-blue-600 cursor-pointer hover:underline">
                      {orderNumber}TRACK
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 text-gray-800">
                  <MapPin size={18} />
                  <h3 className="font-semibold">Shipping Address</h3>
                </div>
                {order.shippingAddress ? (
                  <div className="text-sm">
                    <p className="mb-1 font-medium">{order.shippingAddress.name || 'Customer'}</p>
                    <p className="text-gray-600">{order.shippingAddress.street}</p>
                    <p className="text-gray-600">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p className="text-gray-600">{order.shippingAddress.country}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No shipping address available</p>
                )}
              </div>
            </div>
          </div>

          <Card className="mb-6 shadow-md">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package size={18} />
                <span>Items Ordered</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {order.items.map((item, index) => {
                  const imageKey = `${item.product?.id || item.product?._id || index}`;
                  return (
                    <div
                      key={imageKey}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border">
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

                      <div className="flex-grow">
                        <h3 className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.selectedSize && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              Size: {item.selectedSize}
                            </Badge>
                          )}
                          {item.selectedColor && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              Color: {item.selectedColor}
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            Qty: {item.quantity || 0}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="flex flex-col items-end">
                          <p className="font-semibold text-gray-900">
                            ₹{((item.product?.discountPrice || item.product?.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </p>
                          {item.product?.discountPrice && item.product?.price && (
                            <p className="text-sm text-gray-500 line-through">
                              ₹{(item.product.price * (item.quantity || 1)).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            
            <CardFooter className="p-0">
              <div className="w-full bg-gray-50 p-4 rounded-b-lg">
                <div className="ml-auto w-full md:w-72">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping:</span>
                      <span className="text-emerald-600">Free</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (18%):</span>
                      <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>

          <div className="flex justify-center md:justify-end">
            <div className="text-sm text-gray-500">
              Need help with your order? 
              <Button variant="link" className="text-sm p-0 h-auto ml-1" aria-label="Contact support">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDetails;