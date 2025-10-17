import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Minus, ImageOff, Loader2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';

interface CartItemProps {
  item: CartItemType;
  isLoading?: boolean;
}

const CartItem: React.FC<CartItemProps> = ({ item, isLoading = false }) => {
  const { removeFromCart, updateQuantity } = useAuth();
  const firstImage = item?.product?.images?.[0];
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [firstImage]);

  if (isLoading) {
    return (
      <div className="flex items-center py-4 border-b">
        <div className="w-20 h-20 rounded overflow-hidden mr-4 bg-gray-100 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
        <div className="flex-grow space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gray-100 rounded"></div>
          <div className="w-8 text-center">
            <div className="h-5 bg-gray-100 rounded w-full"></div>
          </div>
          <div className="h-8 w-8 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const imageSrc = firstImage ? getImageUrl(firstImage) : null;

  if (!item || !item.product) {
    return (
      <div className="flex items-center py-4 border-b">
        <div className="w-20 h-20 rounded overflow-hidden mr-4 bg-gray-100 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
        <div className="flex-grow">
          <h3 className="font-medium text-gray-500">Loading product...</h3>
        </div>
      </div>
    );
  }

  const { product, quantity = 1, selectedColor, selectedSize, _id } = item;

  const basePrice = product.price !== undefined ? Number(product.price) : null;
  const discountPrice = product.discountPrice !== undefined ? Number(product.discountPrice) : null;
  const displayPrice = discountPrice ?? basePrice ?? '...';
  const totalPrice = typeof displayPrice === 'number' ? displayPrice * quantity : '...';

  const handleIncreaseQuantity = () => updateQuantity(_id, quantity + 1);
  const handleDecreaseQuantity = () => quantity > 1 && updateQuantity(_id, quantity - 1);
  const handleRemove = () => removeFromCart(_id);

  return (
    <div className="flex items-center py-4 border-b">
      <div className="w-20 h-20 rounded overflow-hidden mr-4 bg-gray-100 flex items-center justify-center">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <ImageOff className="text-gray-400" size={24} />
        )}
      </div>

      <div className="flex-grow mr-4">
        <h3 className="font-medium">{product.name || 'Loading...'}</h3>
        <div className="text-sm text-gray-500">
          {selectedSize && <span className="mr-2">Size: {selectedSize}</span>}
          {selectedColor && <span>Color: {selectedColor}</span>}
        </div>
        <div className="mt-1">
          {typeof displayPrice === 'number' ? (
            <>
              <span className="font-medium">₹{displayPrice.toFixed(2)}</span>
              {discountPrice !== null && basePrice !== null && basePrice > 0 && (
                <span className="line-through text-gray-500 ml-2">
                  ₹{basePrice.toFixed(2)}
                </span>
              )}
            </>
          ) : (
            <span className="font-medium">Loading price...</span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleDecreaseQuantity}
          disabled={quantity <= 1}
        >
          <Minus size={16} />
        </Button>
        <span className="w-8 text-center">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleIncreaseQuantity}
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="ml-4 w-24 text-right">
        {typeof totalPrice === 'number' ? (
          <div className="font-medium">₹{totalPrice.toFixed(2)}</div>
        ) : (
          <div className="font-medium">...</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 mt-1"
          onClick={handleRemove}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
};

export default CartItem;