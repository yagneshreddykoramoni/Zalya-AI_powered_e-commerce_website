
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Product } from '../lib/types';
import WishlistButton from './product/WishlistButton';
import { getImageUrl } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, isAuthenticated } = useAuth();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const productForCart: Product = product._id ? product : { ...product, _id: product.id };

    try {
      await addToCart(productForCart, 1); // Add 1 quantity by default
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    }
  };

  const { id, name, price, discountPrice, images, brand, rating, reviewCount } = product;

  // Generate stars based on rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300">★</span>);
      }
    }

    return stars;
  };

  return (
    <div className="product-card bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Link to={`/product/${id}`} className="block">
        <div className="relative">
        <img
          src={images[0] ? getImageUrl(images[0]) : "/placeholder.svg"}
          alt={name}
          className="product-image"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
          <div className="absolute top-2 right-2">
            <WishlistButton product={product} size="icon" showText={false} />
          </div>
          {discountPrice && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
              {Math.round(((price - discountPrice) / price) * 100)}% OFF
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 mb-1">{brand}</p>
          <h3 className="font-medium text-gray-900 mb-1 truncate-2" title={name}>{name}</h3>
          <div className="flex items-center mb-2">
            <div className="flex mr-2">
              {renderStars()}
            </div>
            <span className="text-xs text-gray-500">({reviewCount})</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {discountPrice ? (
                <>
                  <span className="font-bold text-gray-900">₹{discountPrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 line-through ml-2">₹{price.toFixed(2)}</span>
                </>
              ) : (
                <span className="font-bold text-gray-900">₹{price.toFixed(2)}</span>
              )}
            </div>
            <Button size="sm" onClick={handleAddToCart} disabled={!isAuthenticated}>
              Add
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
