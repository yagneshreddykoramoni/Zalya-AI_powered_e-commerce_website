
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { mockProducts } from '@/lib/mockData';
import { Product } from '@/lib/types';
import { Check, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedOutfitSuggestionsProps {
  product: Product;
}

const EnhancedOutfitSuggestions: React.FC<EnhancedOutfitSuggestionsProps> = ({ product }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get user's purchase history, or use sample data if none exists
  const userOrders = user?.orders || [];
  const purchasedProducts = userOrders.flatMap(order => 
    order.items.map(item => item.product)
  );
  
  // Get complementary products based on the current product and user history
  const getComplementaryProducts = (): { items: Product[], personalized: boolean, message: string } => {
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
    
    // If user has purchase history, try to find a personalized outfit
    if (purchasedProducts.length > 0) {
      // Find purchased items that would match with current product
      const matchingPurchasedItems = purchasedProducts.filter(p => 
        matchingCategories.includes(p.category) && 
        p.id !== product.id
      );
      
      if (matchingPurchasedItems.length > 0) {
        // Found a personalized match!
        const recentPurchase = matchingPurchasedItems[0];
        
        // Find additional complementary products
        const additionalItems = mockProducts.filter(p => 
          (matchingCategories.includes(p.category) || p.category === recentPurchase.category) && 
          p.id !== product.id &&
          p.id !== recentPurchase.id
        ).slice(0, 1);
        
        return {
          items: [recentPurchase, ...additionalItems],
          personalized: true,
          message: `This ${product.name} perfectly matches the ${recentPurchase.name} you bought recently. Complete your look with our suggestion!`
        };
      }
    }
    
    // Default to generic matches
    const complementaryProducts = mockProducts.filter(p => 
      matchingCategories.includes(p.category) && 
      p.id !== product.id
    ).slice(0, 2);
    
    return {
      items: complementaryProducts,
      personalized: false,
      message: `These items pair perfectly with your ${product.name}. Complete the look!`
    };
  };

  const outfitSuggestion = getComplementaryProducts();
  
  // Function to determine compatibility score (in a real app, this would use ML)
  const getCompatibilityScore = (): number => {
    return outfitSuggestion.personalized 
      ? Math.round(90 + Math.random() * 9) // 90-99% for personalized
      : Math.round(80 + Math.random() * 14); // 80-94% for generic
  };
  
  const handleAddOutfitToCart = () => {
    // In a real app, this would add all products to cart
    toast({
      title: "Complete outfit added to cart",
      description: `Added ${product.name} and ${outfitSuggestion.items.length} complementary items`,
    });
  };
  
  if (!outfitSuggestion.items.length) return null;
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Complete Your Outfit</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {outfitSuggestion.message}
        </p>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
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
          {outfitSuggestion.items.map(item => (
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

export default EnhancedOutfitSuggestions;
