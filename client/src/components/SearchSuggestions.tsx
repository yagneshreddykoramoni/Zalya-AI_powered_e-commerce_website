import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, TrendingUp } from 'lucide-react';
import productService from '@/services/productService';
import { Product } from '@/lib/types';
import { getImageUrl } from '@/lib/utils';

interface SearchSuggestionsProps {
  query: string;
  onSelect: () => void;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({ query, onSelect }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || !query.trim()) {
      setProducts([]);
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    // Debounce
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const resp = await productService.getProducts({ query, limit: 6 });
        if (!mounted) return;
        setProducts((resp && resp.products) || []);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error('Search suggestions error', err);
        setError('Failed to load suggestions');
      } finally {
        if (mounted) setLoading(false);
      }
    }, 220);

    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  if (!query.trim()) return null;

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
    onSelect();
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
    onSelect();
  };

  const handleSearchClick = (term: string) => {
    navigate(`/products?query=${encodeURIComponent(term)}`);
    onSelect();
  };

  const handleViewAllClick = () => {
    navigate(`/products?query=${encodeURIComponent(query)}`);
    onSelect();
  };

  const trendingSearches = ["summer dress", "men's shoes", "smartphone", "headphones"];

  return (
    <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-md mt-1 z-50">
      <div className="p-2">
        <h3 className="text-sm font-semibold px-3 py-1 text-gray-500">Results</h3>
        {loading && <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>}
        {error && <div className="px-3 py-2 text-sm text-red-500">{error}</div>}
        {!loading && products.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-500">No results</div>
        )}
        {!loading && products.map((product) => (
          <div
            key={(product as Product)._id || (product as Product).id}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
            onClick={() => handleProductClick((product as Product)._id || (product as Product).id)}
          >
            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              <img
                src={(product as Product).images?.[0] ? getImageUrl((product as Product).images[0]) : '/placeholder.svg'}
                alt={(product as Product).name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium truncate">{(product as Product).name}</p>
              <p className="text-xs text-gray-500">{(product as Product).brand}</p>
            </div>
            <div className="text-sm font-semibold flex-shrink-0">
                          <p className="text-sm font-semibold text-brand-600">
              ₹{(Number((product as Product).discountPrice) || Number((product as Product).price) || 0).toFixed(2)}
            </p>
            </div>
          </div>
        ))}
      </div>

      {/* Categories + Trending */}
      <div className="p-2 border-t border-gray-100">
        <h3 className="text-sm font-semibold px-3 py-1 text-gray-500">Trending Searches</h3>
        <div className="grid grid-cols-2 gap-2">
          {trendingSearches.map((term, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => handleSearchClick(term)}
            >
              <TrendingUp size={14} className="text-gray-400" />
              <span className="text-sm">{term}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="p-3 text-center text-brand-600 hover:text-brand-700 border-t border-gray-100 cursor-pointer"
        onClick={handleViewAllClick}
      >
        View all results for "{query}"
      </div>
    </div>
  );
};

export default SearchSuggestions;
