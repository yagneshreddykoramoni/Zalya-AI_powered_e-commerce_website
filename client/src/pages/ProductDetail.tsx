
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Share2, 
  ShoppingCart, 
  Check, 
  ArrowRight, 
  Star, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  MessageSquare
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { mockProducts } from '../lib/mockData';
import { Product } from '../lib/types';
import VisualTryOn from '../components/product/VisualTryOn';
import PriceComparison from '../components/product/PriceComparison';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import EnhancedOutfitSuggestions from '@/components/recommendations/EnhancedOutfitSuggestions';
import PersonalizedRecommendations from '@/components/recommendations/PersonalizedRecommendations';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import ProductReviews from '@/components/product/ProductReviews';
import ShareToCommunity from '@/components/product/ShareToCommunity';
import WishlistButton from '@/components/product/WishlistButton';
import { Card } from '@/components/ui/card';
import productService from '../services/productService';
import styleSuggestionsService from '../services/styleSuggestionsService';
import { getImageUrl } from '../lib/utils';

type SuggestionSource = 'ai' | 'fallback' | 'local-fallback' | null;

interface ProductStyleSuggestionResponse {
  productId: string;
  productName: string;
  suggestions?: string[];
  source?: 'ai' | 'fallback';
}

const buildLocalStyleFallback = (product: Product): string[] => {
  const name = product?.name || 'this piece';
  const category = (product?.category || 'outfit').toLowerCase();
  const primaryColor = product?.colors && product.colors.length > 0 ? product.colors[0].toLowerCase() : undefined;

  const lineOne = primaryColor
    ? `Balance ${name} with ${primaryColor} layers to keep the palette smooth and intentional.`
    : `Let ${name} shine by pairing it with soft neutrals and clean, structured layers.`;

  let lineTwo = 'Finish with a standout accessory to personalise the look instantly.';

  if (category.includes('dress')) {
    lineTwo = 'Elevate it with delicate jewelry and a structured mini bag for polish.';
  } else if (category.includes('shirt') || category.includes('top') || category.includes('t-shirt')) {
    lineTwo = 'Tuck into tailored bottoms and add loafers for a sharp day-to-night transition.';
  } else if (category.includes('pant') || category.includes('jean') || category.includes('trouser')) {
    lineTwo = 'Pair with a fitted knit and layered chains to define the silhouette.';
  }

  return [lineOne, lineTwo];
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [styleSuggestion, setStyleSuggestion] = useState<string[]>([]);
  const [styleSuggestionSource, setStyleSuggestionSource] = useState<SuggestionSource>(null);
  const [styleSuggestionLoading, setStyleSuggestionLoading] = useState(false);
  const [styleSuggestionError, setStyleSuggestionError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productService.getProductById(id);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          title: 'Error',
          description: 'Failed to load product details',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProduct();
    }
  }, [id, toast]);

  useEffect(() => {
    if (!product) {
      setStyleSuggestion([]);
      setStyleSuggestionSource(null);
      return;
    }

    let isCancelled = false;

    const fetchSuggestion = async () => {
      try {
        setStyleSuggestionLoading(true);
        setStyleSuggestionError(null);

        const response = await styleSuggestionsService.getProductStyleSuggestion(
          product._id || product.id
        ) as ProductStyleSuggestionResponse;

        if (isCancelled) {
          return;
        }

        const suggestions = Array.isArray(response?.suggestions)
          ? response.suggestions.filter((line) => typeof line === 'string' && line.trim().length > 0)
          : [];

        if (suggestions.length > 0) {
          setStyleSuggestion(suggestions.slice(0, 2));
          setStyleSuggestionSource(response?.source === 'ai' || response?.source === 'fallback' ? response.source : 'ai');
        } else {
          const fallback = buildLocalStyleFallback(product);
          setStyleSuggestion(fallback);
          setStyleSuggestionSource('local-fallback');
        }
      } catch (error) {
        console.error('Failed to fetch product style suggestion:', error);

        if (isCancelled) {
          return;
        }

        const fallback = buildLocalStyleFallback(product);
        setStyleSuggestion(fallback);
        setStyleSuggestionSource('local-fallback');
        setStyleSuggestionError('Showing a quick fallback tip while suggestions are unavailable.');
      } finally {
        if (!isCancelled) {
          setStyleSuggestionLoading(false);
        }
      }
    };

    fetchSuggestion();

    return () => {
      isCancelled = true;
    };
  }, [product]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading product...</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Button>
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  const handleAddToCart = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to add items to your cart",
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with adding to cart if authenticated
    addToCart(product, quantity, selectedColor || undefined, selectedSize || undefined);
    
    toast({
      title: "Added to cart",
      description: `${product.name} (${quantity}) has been added to your cart.`,
      duration: 3000,
    });
  };
  
  const handleShare = () => {
    console.log('Sharing product:', product.id);
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  // Sample reviews for the product
  const sampleReviews = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Emma Johnson',
      userImage: 'https://source.unsplash.com/random/100x100/?woman',
      rating: 5,
      comment: 'Absolutely love this product! The quality is exceptional and it fits perfectly. Highly recommend to anyone looking for something stylish and comfortable.',
      date: new Date('2023-08-15'),
      helpfulCount: 12,
      notHelpfulCount: 2,
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Michael Chen',
      userImage: 'https://source.unsplash.com/random/100x100/?man',
      rating: 4,
      comment: 'Great product, very happy with my purchase. Shipping was fast and the item arrived in perfect condition. Only giving 4 stars because the color was slightly different than pictured.',
      date: new Date('2023-09-03'),
      helpfulCount: 8,
      notHelpfulCount: 1,
    },
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-gray-100 py-2">
          <div className="container mx-auto px-4">
            <div className="text-sm text-gray-600">
              <Link to="/" className="hover:text-brand-600">Home</Link>
              <span className="mx-2">/</span>
              <Link to={`/category/${product.category}`} className="hover:text-brand-600">{product.category}</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{product.name}</span>
            </div>
          </div>
        </div>
        
        {/* Product Detail */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row -mx-4 mt-10">
            {/* Product Images */}
            <div className="lg:w-7/12 px-4 mb-8 lg:mb-0">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Thumbnails */}
                <div className="order-2 md:order-1 md:w-1/5 flex md:flex-col gap-2 mt-4 md:mt-0">
                  {product.images.map((image, index) => (
                    <div
                      key={index}
                      className={`cursor-pointer border-2 ${
                        selectedImage === index ? 'border-brand-600' : 'border-transparent'
                      } rounded-md overflow-hidden aspect-square`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img
                        src={getImageUrl(image)}
                        alt={`${product.name} - View ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Main Image */}
                <div className="order-1 md:order-2 md:w-4/5">
                  <div className="aspect-square rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <img 
                      src={getImageUrl(product.images[selectedImage])}
                      alt={product.name}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  
                  {/* Image navigation buttons */}
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                      disabled={product.images.length <= 1}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                      disabled={product.images.length <= 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Product Info */}
            <div className="lg:w-5/12 px-4">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
                
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className={`${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-gray-600">{product.reviewCount} reviews</span>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center">
                    {product.discountPrice ? (
                      <>
                        <span className="text-2xl font-bold mr-2">₹{product.discountPrice.toFixed(2)}</span>
                        <span className="text-lg text-gray-500 line-through">₹{product.price.toFixed(2)}</span>
                        <span className="ml-2 bg-red-100 text-red-600 text-sm px-2 py-1 rounded">
                          {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">₹{product.price.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.stock > 10 ? (
                      <span className="text-green-600 flex items-center">
                        <Check size={16} className="mr-1" />
                        In Stock
                      </span>
                    ) : product.stock > 0 ? (
                      <span className="text-orange-600">Only {product.stock} left</span>
                    ) : (
                      <span className="text-red-600">Out of Stock</span>
                    )}
                  </p>
                </div>
                
                {/* Outfit Coordination AI Tip */}
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 mb-6 border border-purple-100">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      <MessageSquare size={18} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-purple-800">Style Suggestion</h3>
                        {styleSuggestionSource && (
                          <span className="text-xs text-gray-400">
                            {styleSuggestionSource === 'ai'
                              ? 'AI-generated'
                              : 'Showing a trusted fallback styling tip'}
                          </span>
                        )}
                      </div>
                      {styleSuggestionLoading ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500 animate-pulse">Crafting real-time styling tips…</p>
                          <p className="text-sm text-gray-300 animate-pulse">This just takes a moment.</p>
                        </div>
                      ) : styleSuggestion.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {styleSuggestion.join(' ')}
                          </p>
                          {styleSuggestionError && (
                            <p className="text-xs text-amber-600 mt-2">{styleSuggestionError}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">We&rsquo;ll share styling notes as soon as more product details are available.</p>
                      )}
                    </div>
                  </div>
                </Card>
                
                {/* Visual Try-On and Price Comparison */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <VisualTryOn productName={product.name} productImage={product.images[0]} product={product} />
                  <PriceComparison productName={product.name} currentPrice={product.discountPrice || product.price} />
                </div>
                
                <div className="mb-6">
                  <p className="font-medium mb-2">Description:</p>
                  <p className="text-gray-600">{product.description}</p>
                </div>
                
                {/* Color Selection */}
                {product.colors && (
                  <div className="mb-6">
                    <p className="font-medium mb-2">Color: {selectedColor && <span className="font-normal">{selectedColor}</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color}
                          className={`px-4 py-2 rounded-md border ${
                            selectedColor === color
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Size Selection */}
                {product.sizes && (
                  <div className="mb-6">
                    <p className="font-medium mb-2">Size: {selectedSize && <span className="font-normal">{selectedSize}</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          className={`w-12 h-12 flex items-center justify-center rounded-md border ${
                            selectedSize === size
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quantity */}
                <div className="mb-6">
                  <p className="font-medium mb-2">Quantity:</p>
                  <div className="flex items-center">
                    <button
                      className="w-10 h-10 border border-gray-300 rounded-l-md flex items-center justify-center"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <div className="w-16 h-10 border-t border-b border-gray-300 flex items-center justify-center">
                      {quantity}
                    </div>
                    <button
                      className="w-10 h-10 border border-gray-300 rounded-r-md flex items-center justify-center"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mb-6">
                  <Button
                    size="lg"
                    className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700"
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart size={18} />
                    Add to Cart
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <WishlistButton product={product} className="w-full" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex items-center justify-center gap-2 w-full"
                        >
                          <Share2 size={18} />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}>
                          <Facebook size={16} className="mr-2" />
                          <span>Facebook</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?url=${window.location.href}&text=${encodeURIComponent(product.name)}`, '_blank')}>
                          <Twitter size={16} className="mr-2" />
                          <span>Twitter</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`, '_blank')}>
                          <Linkedin size={16} className="mr-2" />
                          <span>LinkedIn</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://www.instagram.com/`, '_blank')}>
                          <Instagram size={16} className="mr-2" />
                          <span>Instagram</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                          <MessageSquare size={16} className="mr-2" />
                          <span>Community</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Product Highlights */}
                <div className="border-t border-gray-200 pt-6">
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Check size={18} className="text-green-600 mr-2 mt-0.5 shrink-0" />
                      <span>Free shipping for orders over ₹50</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={18} className="text-green-600 mr-2 mt-0.5 shrink-0" />
                      <span>Easy returns within 30 days</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={18} className="text-green-600 mr-2 mt-0.5 shrink-0" />
                      <span>1 year warranty on all products</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Outfit Coordination Section */}
          {product && <EnhancedOutfitSuggestions product={product} />}
          
          {/* "You May Also Like" Section - Make sure it comes before reviews */}
          <PersonalizedRecommendations productId={product.id} />
          
          {/* Product Reviews */}
          <ProductReviews productId={id || ''} />
        </div>
      </main>
      <Footer />
      
      {/* Share to Community Dialog */}
      <ShareToCommunity 
        product={product} 
        open={isShareDialogOpen} 
        onClose={() => setIsShareDialogOpen(false)} 
      />
    </div>
  );
};

export default ProductDetail;
