import React, { useEffect, useState } from 'react';
import { ShoppingCart, CreditCard, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartItem from '../components/cart/CartItem';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const Cart = () => {
  const { 
    cart, 
    clearCart, 
    isAuthenticated, 
    isLoading: isAuthLoading,
    fetchCart 
  } = useAuth();
  
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Properly fetch and handle cart data
  const loadCart = async () => {
    if (!isAuthenticated) {
      setIsCartLoading(false);
      return;
    }

    setIsCartLoading(true);
    setHasError(false);
    
    try {
      await fetchCart();
      
      // Validate cart data
      if (!cart || !cart.items || cart.items.some(item => !item.product)) {
        throw new Error('Incomplete cart data');
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
      setHasError(true);
      toast.error('Failed to load cart data');
    } finally {
      setIsCartLoading(false);
    }
  };

  // Initial load and retry mechanism
  useEffect(() => {
    loadCart();
  }, [isAuthenticated, retryCount]);

  // Show loading state only when necessary
  const showLoading = isAuthLoading || isCartLoading;

  // Calculate totals safely
  const calculateTotals = () => {
    if (!cart) return { subtotal: 0, tax: 0, total: 0 };
    
    const subtotal = cart.total || cart.items?.reduce((sum, item) => {
      const price = item.product?.discountPrice ?? item.product?.price ?? 0;
      return sum + (price * (item.quantity || 1));
    }, 0) || 0;

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const { subtotal, tax, total } = calculateTotals();

  // Render cart items or empty state
  const renderCartContent = () => {
    if (hasError) {
      return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mb-6 flex justify-center">
            <ShoppingCart size={64} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-medium mb-4">Couldn't load your cart</h2>
          <p className="text-gray-500 mb-8">There was an error loading your cart items</p>
          <Button 
            onClick={() => setRetryCount(prev => prev + 1)}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </Button>
        </div>
      );
    }

    if (!cart?.items?.length) {
      return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mb-6 flex justify-center">
            <ShoppingCart size={64} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-medium mb-4">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added any products yet</p>
          <Button asChild>
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between border-b pb-4">
              <h2 className="text-lg font-medium">Cart Items ({cart.items.length})</h2>
              <Button 
                variant="ghost" 
                onClick={clearCart} 
                className="text-red-500 hover:text-red-700"
                disabled={showLoading}
              >
                Clear Cart
              </Button>
            </div>
            
            <div className="divide-y">
              {cart.items.map((item) => (
                <CartItem 
                  key={`${item._id}-${item.selectedColor}-${item.selectedSize}`} 
                  item={item} 
                />
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{tax}</span>
              </div>
              
              <div className="border-t my-4 pt-2">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
              
              <Button className="w-full mt-4" asChild disabled={showLoading || hasError}>
                {isAuthenticated ? (
                  <Link to="/checkout">
                    <CreditCard className="mr-2" size={18} />
                    Proceed to Checkout
                    <ChevronRight className="ml-2" size={18} />
                  </Link>
                ) : (
                  <Link to="/login?redirect=checkout">
                    Login to Checkout
                    <ChevronRight className="ml-2" size={18} />
                  </Link>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <ShoppingCart className="mr-2" />
          Your Shopping Cart
        </h1>
        
        {showLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        ) : (
          renderCartContent()
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;