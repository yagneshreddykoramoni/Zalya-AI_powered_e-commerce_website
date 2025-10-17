import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import productService from '@/services/productService';
import api from '@/services/api';
import { Product } from '@/lib/types';

const Wishlist = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [failedProducts, setFailedProducts] = useState<string[]>([]);
  const navigate = useNavigate();

  // Add this useEffect at the top level of your component
  useEffect(() => {
    console.log('Wishlist component mounted with user:', user);
    console.log('Wishlist data:', user?.wishlist);
  }, []);
  
  // In the useEffect hook where you fetch wishlist products
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!user?.wishlist || user.wishlist.length === 0) {
        setWishlistProducts([]);
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        const failedIds: string[] = [];
        const productResults: Product[] = [];
        
        // Process each product ID sequentially to avoid overwhelming the server
        for (const productId of user.wishlist) {
          try {
            // Ensure productId is a string, not an object
            const idToFetch = typeof productId === 'object' ? 
              (productId._id || productId.id || JSON.stringify(productId)) : 
              productId;
              
            console.log(`Fetching product with ID: ${idToFetch}`);
            const product = await productService.getProductById(idToFetch);
            if (product) {
              productResults.push(product);
            } else {
              failedIds.push(String(idToFetch));
              console.warn(`Product with ID ${idToFetch} not found`);
            }
          } catch (error) {
            failedIds.push(String(productId));
            console.error(`Error fetching product ${productId}:`, error);
          }
        }
        
        setWishlistProducts(productResults);
        setFailedProducts(failedIds);
        
        // If any products failed to load, notify the user
        if (failedIds.length > 0) {
          console.warn(`Failed to load ${failedIds.length} wishlist items`);
        }
      } catch (error) {
        console.error('Error fetching wishlist products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your wishlist items',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchWishlistProducts();
  }, [user?.wishlist, toast]);
  
  // In the removeFromWishlist function
  const removeFromWishlist = async (productId: string) => {
    try {
      setRemovingIds(prev => [...prev, productId]);
      
      console.log('Removing product from wishlist:', productId);
      const response = await api.post('/auth/wishlist/remove', { productId });
      
      // Update user in context with new wishlist
      updateUser({
        ...user,
        wishlist: response.data.wishlist
      });
      
      // Update local state
      setWishlistProducts(prev => prev.filter(p => (p._id || p.id) !== productId));
      
      toast({
        title: 'Removed from wishlist',
        description: 'Item has been removed from your wishlist',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item from wishlist',
        variant: 'destructive'
      });
    } finally {
      setRemovingIds(prev => prev.filter(id => id !== productId));
    }
  };

  // Handle navigation to product detail
  const handleProductClick = (productId) => {
    // Log the productId for debugging
    console.log('Navigating to product with ID:', productId);
    
    // Check if productId is an object or string and extract correctly
    const id = typeof productId === 'object' ? 
      (productId._id || productId.id) : 
      productId;
    
    // Use the correct route format - check how it's done on the Products page
    navigate(`/product/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-brand-600" />
            <h2 className="text-2xl font-bold">Loading your wishlist...</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <Heart className="mr-2" />
            Your Wishlist
          </h1>
        </div>
        
        {failedProducts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-6">
            <p className="font-medium">
              {failedProducts.length === 1 
                ? '1 item could not be loaded' 
                : `${failedProducts.length} items could not be loaded`}
            </p>
            <p className="mt-1 text-sm">Some products in your wishlist may no longer be available.</p>
          </div>
        )}
        
        {wishlistProducts.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wishlistProducts.map((product) => (
                <div 
                  key={product._id} 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    // Prevent click when clicking the remove button
                    if (e.target.closest('button')) return;
                    handleProductClick(product._id);
                  }}
                >
                  <ProductCard product={product} />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(product._id);
                    }}
                    disabled={removingIds.includes(product._id)}
                  >
                    {removingIds.includes(product._id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button asChild variant="outline">
                <Link to="/products">
                  Continue Shopping
                </Link>
              </Button>
              <Button asChild>
                <Link to="/cart">
                  <ShoppingCart className="mr-2" />
                  Go to Cart
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-6 flex justify-center">
              <Heart size={64} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-medium mb-4">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">You haven't added any products to your wishlist yet.</p>
            <Button asChild>
              <Link to="/products">Discover Products</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;