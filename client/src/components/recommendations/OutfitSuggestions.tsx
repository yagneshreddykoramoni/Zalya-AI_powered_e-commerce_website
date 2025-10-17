
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/lib/types';
import { Check, RefreshCw, Loader2 } from 'lucide-react';
import styleSuggestionsService from '@/services/styleSuggestionsService';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Outfit {
  top: Product | null;
  bottom: Product | null;
  accessory: Product | null;
}

interface StyleSuggestionsData {
  gender: string;
  outfits: Outfit[];
  lastUpdated: string;
  cached: boolean;
}

interface OutfitSuggestionsProps {
  productId?: string;
}

const OutfitSuggestions: React.FC<OutfitSuggestionsProps> = () => {
  const { isAuthenticated, addToCart } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<StyleSuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingOutfitIndex, setAddingOutfitIndex] = useState<number | null>(null);

  // Fetch style suggestions on component mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching style suggestions...');
      const data = await styleSuggestionsService.getStyleSuggestions();
      console.log('Received suggestions:', JSON.stringify(data, null, 2));
      
      if (data && data.outfits && data.outfits.length > 0) {
        console.log(`Successfully loaded ${data.outfits.length} outfits`);
        setSuggestions(data);
      } else {
        console.warn('No outfits in response:', data);
        const debugMsg = data?.debug 
          ? `Debug info - Tops: ${data.debug.tops}, Bottoms: ${data.debug.bottoms}, Accessories: ${data.debug.accessories}`
          : 'No debug information available';
        setError(`No outfit suggestions available. ${debugMsg}. Try clicking "Generate New" to create fresh suggestions.`);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      const error = err as { response?: { data?: { message?: string; debug?: { tops: number; bottoms: number; accessories: number } } }; message?: string };
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const debugInfo = error.response?.data?.debug 
        ? ` (Tops: ${error.response.data.debug.tops}, Bottoms: ${error.response.data.debug.bottoms}, Accessories: ${error.response.data.debug.accessories})`
        : '';
      setError(`Failed to load suggestions: ${errorMsg}${debugInfo}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await styleSuggestionsService.refreshStyleSuggestions();
      setSuggestions(data);
    } catch (err) {
      console.error('Error refreshing suggestions:', err);
      setError('Failed to refresh suggestions');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddOutfitToCart = async (outfit: Outfit, index: number) => {
    if (!isAuthenticated) {
      toast({
        title: 'Please sign in',
        description: 'Log in to add outfits to your cart.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    const itemsToAdd = [outfit.top, outfit.bottom, outfit.accessory].filter(Boolean) as Product[];

    if (itemsToAdd.length === 0) {
      toast({
        title: 'Nothing to add',
        description: 'This outfit does not have any available items right now.',
      });
      return;
    }

    try {
      setAddingOutfitIndex(index);
      
      // Add items sequentially to avoid MongoDB version conflict
      for (const item of itemsToAdd) {
        await addToCart(item, 1);
      }

      toast({
        title: 'Outfit added to cart',
        description: `${itemsToAdd.length} item${itemsToAdd.length > 1 ? 's' : ''} added successfully.`,
      });

      navigate('/cart');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add outfit to cart';
      toast({
        title: 'Could not add outfit',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAddingOutfitIndex(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Style Suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <span className="ml-2 text-gray-600">Loading your personalized outfit...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Style Suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-2 font-medium">Error Loading Suggestion</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={fetchSuggestions} variant="outline">
                Try Again
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Generate New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || !suggestions.outfits || suggestions.outfits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Style Suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No outfit suggestion available yet.</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generate Outfit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Your Style Suggestion</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {suggestions.outfits.map((outfit, index) => (
          <div key={index} className="border rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white">
            <h3 className="font-medium mb-4 text-center text-gray-700">Complete Your Look</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Top */}
              {outfit.top && (
                <div 
                  className="cursor-pointer group"
                  onClick={() => navigate(`/product/${outfit.top?._id || outfit.top?.id}`)}
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-white border group-hover:border-brand-500 transition-colors">
                    <img 
                      src={outfit.top.images?.[0] ? getImageUrl(outfit.top.images[0]) : '/placeholder.svg'}
                      alt={outfit.top.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Top</p>
                    <p className="text-sm font-medium truncate">{outfit.top.name}</p>
                    <p className="text-sm font-semibold text-brand-600">
                      ₹{(outfit.top.discountPrice || outfit.top.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom */}
              {outfit.bottom && (
                <div 
                  className="cursor-pointer group"
                  onClick={() => navigate(`/product/${outfit.bottom?._id || outfit.bottom?.id}`)}
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-white border group-hover:border-brand-500 transition-colors">
                    <img 
                      src={outfit.bottom.images?.[0] ? getImageUrl(outfit.bottom.images[0]) : '/placeholder.svg'}
                      alt={outfit.bottom.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Bottom</p>
                    <p className="text-sm font-medium truncate">{outfit.bottom.name}</p>
                    <p className="text-sm font-semibold text-brand-600">
                      ₹{(outfit.bottom.discountPrice || outfit.bottom.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Accessory */}
              {outfit.accessory && (
                <div 
                  className="cursor-pointer group"
                  onClick={() => navigate(`/product/${outfit.accessory?._id || outfit.accessory?.id}`)}
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-white border group-hover:border-brand-500 transition-colors">
                    <img 
                      src={outfit.accessory.images?.[0] ? getImageUrl(outfit.accessory.images[0]) : '/placeholder.svg'}
                      alt={outfit.accessory.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Accessory</p>
                    <p className="text-sm font-medium truncate">{outfit.accessory.name}</p>
                    <p className="text-sm font-semibold text-brand-600">
                      ₹{(outfit.accessory.discountPrice || outfit.accessory.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between items-center pt-4 border-t">
              <div className="flex items-center text-xs text-green-600">
                <Check size={14} className="mr-1" />
                <span>Perfect style match</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleAddOutfitToCart(outfit, index)}
                disabled={addingOutfitIndex === index}
              >
                {addingOutfitIndex === index ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </span>
                ) : (
                  'Add Outfit to Cart'
                )}
              </Button>
            </div>
          </div>
        ))}
        
        <div className="text-center text-xs text-gray-500 pt-2">
          Suggestions stay the same until you generate new ones with the refresh button
        </div>
      </CardContent>
    </Card>
  );
};

export default OutfitSuggestions;
