
import React, { useState, useEffect } from 'react';
import RecommendedProducts from './RecommendedProducts';
import { useAuth } from '@/contexts/AuthContext';
import productService from '@/services/productService';
import { Product } from '@/lib/types';

interface PersonalizedRecommendationsProps {
  productId?: string;
}

const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({ 
  productId 
}) => {
  const { user } = useAuth();
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build params object for the API call
        const params: any = {};
        if (user?.id) {
          params.userId = user.id;
        }
        if (productId) {
          params.productId = productId;
        }
        
        const recommendations = await productService.getPersonalizedRecommendations(params);
        
        setRecommendedProducts(recommendations);
      } catch (err) {
        console.error('Error fetching personalized recommendations:', err);
        setError('Failed to load recommendations');
        // Fallback to empty array on error
        setRecommendedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.id, productId]);

  // Don't render anything while loading
  if (loading) {
    return (
      <div className="py-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // Determine the title based on context
  const getTitle = () => {
    if (productId) return "You May Also Like";
    if (user) return "Recommended For You";
    return "Popular Items";
  };
  
  // If there's an error or no products, show a fallback UI unless in product detail page
  if ((error || !recommendedProducts.length) && !productId) {
    console.log('No personalized recommendations available, showing fallback UI');
    return (
      <div className="py-6">
        <h2 className="text-2xl font-bold mb-4">{getTitle()}</h2>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 text-center">
          <p className="text-gray-600">
            {user ? 
              "We're personalizing recommendations based on your activity. Check back soon!" :
              "Sign in to see personalized product recommendations."}
          </p>
        </div>
      </div>
    );
  }
  
  // Don't render anything in product detail page if no recommendations
  if ((error || !recommendedProducts.length) && productId) return null;
  
  return (
    <RecommendedProducts
      title={getTitle()}
      products={recommendedProducts}
      viewMoreLink="/products"
    />
  );
};

export default PersonalizedRecommendations;
