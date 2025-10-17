import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { Product } from '@/lib/types';

type WishlistButtonProps = {
  product: Product;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
};

export default function WishlistButton({ product, className, size = 'default', showText = false }: WishlistButtonProps) {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.wishlist && product) {
      // Get the product ID, ensuring it's a string
      const productId = product._id || product.id;
      // Check if the product ID exists in the wishlist
      const isInList = Array.isArray(user.wishlist) && 
        user.wishlist.some(id => {
          // Handle both string IDs and object IDs
          if (typeof id === 'object') {
            return (id._id === productId || id.id === productId);
          }
          return id === productId;
        });
      
      console.log(`Product ${productId} in wishlist: ${isInList}`, user.wishlist);
      setIsInWishlist(isInList);
    }
  }, [user, product]);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to add items to your wishlist",
        variant: "destructive",
      });
      return;
    }

    if (!product || !(product._id || product.id)) {
      console.error('Invalid product or product ID:', product);
      toast({
        title: 'Error',
        description: 'Cannot add invalid product to wishlist',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Ensure we're using a string ID, not an object
      const productId = product._id || product.id;
      
      // Debug the ID being sent
      console.log('Toggling wishlist for product ID:', productId);
      
      const endpoint = isInWishlist ? '/auth/wishlist/remove' : '/auth/wishlist/add';
      const response = await api.post(endpoint, { productId });
      
      // Debug the response
      console.log('Wishlist API response:', response.data);
      
      if (response.data && response.data.wishlist) {
        // Update local state immediately based on the action we just took
        const newWishlistState = !isInWishlist;
        setIsInWishlist(newWishlistState);
        
        // Update global user state with the new wishlist from the API
        updateUser({
          ...user,
          wishlist: response.data.wishlist
        });
        
        toast({
          title: newWishlistState ? 'Added to wishlist' : 'Removed from wishlist',
          description: newWishlistState 
            ? `${product.name} has been added to your wishlist` 
            : `${product.name} has been removed from your wishlist`,
          variant: 'default'
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast({
        title: 'Error',
        description: isInWishlist
          ? 'Failed to remove from wishlist'
          : 'Failed to add to wishlist',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      onClick={toggleWishlist}
      disabled={isLoading || !isAuthenticated}
    >
      <Heart 
        size={20} 
        className={isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'} 
      />
      {showText && <span className="ml-2">{isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>}
    </Button>
  );
}
