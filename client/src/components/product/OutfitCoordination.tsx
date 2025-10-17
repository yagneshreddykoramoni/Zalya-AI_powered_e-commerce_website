
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { mockProducts } from '@/lib/mockData';
import { Product } from '@/lib/types';
import { Check, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OutfitCoordinationProps {
  product: Product;
}

const OutfitCoordination: React.FC<OutfitCoordinationProps> = ({ product }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get complementary products based on the current product
  const getComplementaryProducts = (): Product[] => {
    const category = product.category;
    
    // Define complementary categories based on the current product
    const complementaryCategories: Record<string, string[]> = {
      'T-Shirts': ['Jeans', 'Shorts', 'Jackets'],
      'Shirts': ['Jeans', 'Pants', 'Suits'],
      'Jeans': ['T-Shirts', 'Shirts', 'Sweaters'],
      'Dresses': ['Jackets', 'Shoes', 'Accessories'],
      'Shoes': ['Pants', 'Jeans', 'Dresses'],
      'Accessories': ['Dresses', 'Shirts', 'T-Shirts'],
    };
    
    const matchingCategories = complementaryCategories[category] || ['T-Shirts', 'Jeans'];
    
    // Find matching products
    return mockProducts
      .filter(p => 
        matchingCategories.includes(p.category) && 
        p.id !== product.id
      )
      .slice(0, 3);
  };

  const complementaryProducts = getComplementaryProducts();
  
  // Function to determine compatibility score (in a real app, this would use ML)
  const getCompatibilityScore = (): number => {
    return Math.round(80 + Math.random() * 19); // 80-99% compatibility
  };
  
  const handleAddOutfitToCart = () => {
    // In a real app, this would add all products to cart
    toast({
      title: "Complete outfit added to cart",
      description: `Added ${product.name} and ${complementaryProducts.length} complementary items`,
    });
  };
  
  if (!complementaryProducts.length) return null;
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Complete Your Outfit</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          These items pair perfectly with your {product.name}
        </p>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Main product */}
          <div className="cursor-pointer">
            <div className="aspect-square rounded-md overflow-hidden">
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs mt-1 font-medium">Selected Item</p>
          </div>
          
          {/* Complementary products */}
          {complementaryProducts.map(item => (
            <div 
              key={item.id} 
              className="cursor-pointer"
              onClick={() => navigate(`/product/${item.id}`)}
            >
              <div className="aspect-square rounded-md overflow-hidden">
                <img 
                  src={item.images[0]} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs mt-1 truncate">{item.name}</p>
              <p className="text-xs font-medium">${(item.discountPrice || item.price).toFixed(2)}</p>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-xs text-gray-600">
            <Check size={14} className="text-green-500 mr-1" />
            <span>{getCompatibilityScore()}% style match</span>
          </div>
          <Button size="sm" onClick={handleAddOutfitToCart} className="flex items-center gap-1">
            <ShoppingCart size={14} />
            Add outfit to cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OutfitCoordination;
