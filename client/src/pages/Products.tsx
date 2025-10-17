import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { Product } from '../lib/types';
import productService from '../services/productService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, Filter, X } from 'lucide-react';

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState(queryParams.get('query') || '');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const MAX_PRICE = 10000;
  const [selectedCategory, setSelectedCategory] = useState(queryParams.get('category') || '');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(MAX_PRICE);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // First fetch categories and brands
  useEffect(() => {
    const fetchCategoriesAndBrands = async () => {
      try {
        const categoriesData = await productService.getCategories();
        const brandsData = await productService.getBrands();
        
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (err) {
        console.error('Error fetching categories and brands:', err);
        setError('Failed to load categories and brands. Please try again.');
      }
    };
    
    fetchCategoriesAndBrands();
  }, []);
  
  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Build query parameters
        const params = {
          query: searchQuery,
          category: selectedCategory,
          brands: selectedBrands.join(','),
          minPrice: 0,
          maxPrice: maxPrice,
          minRating: ratingFilter,
          inStock: inStockOnly,
          sort: sortBy,
          page: currentPage,
          limit: 12 // Number of products per page
        };
        
        const data = await productService.getProducts(params);
        setProducts(data.products);
        setFilteredProducts(data.products);
        setTotalPages(data.pagination.pages);
        setTotalProducts(data.pagination.total);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    navigate({
      pathname: location.pathname,
      search: params.toString()
    }, { replace: true });
    
  }, [searchQuery, selectedCategory, selectedBrands, maxPrice, ratingFilter, 
      sortBy, inStockOnly, currentPage, navigate, location.pathname]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };
  
  // Handle brand selection
  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePriceRangeChange = (value: number[]) => {
    if (value.length === 0) return;
    const [selectedMax] = value;
    setMaxPrice(selectedMax);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
  setSelectedCategory('');
  setSelectedBrands([]);
  setMaxPrice(MAX_PRICE);
    setRatingFilter(0);
    setSortBy('relevance');
    setInStockOnly(false);
    setCurrentPage(1);
  };
  
  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // Scroll to top when page changes
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Filters Sidebar - Always visible on desktop, toggleable on mobile */}
            <div className={`md:w-64 ${showFilters ? 'block' : 'hidden md:block'} bg-white p-4 rounded-lg shadow-sm shrink-0`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">Filters</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters} 
                  className="text-sm text-gray-600"
                >
                  Reset All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowFilters(false)} 
                  className="md:hidden"
                >
                  <X size={18} />
                </Button>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {/* Categories Filter */}
                <AccordionItem value="categories">
                  <AccordionTrigger>Categories</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div 
                        className={`cursor-pointer p-2 rounded ${selectedCategory === '' ? 'bg-brand-100' : 'hover:bg-gray-100'}`}
                        onClick={() => setSelectedCategory('')}
                      >
                        All Categories
                      </div>
                      {categories.map((category, index) => (
                        <div 
                          key={index}
                          className={`cursor-pointer p-2 rounded ${selectedCategory === category ? 'bg-brand-100' : 'hover:bg-gray-100'}`}
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Brands Filter */}
                <AccordionItem value="brands">
                  <AccordionTrigger>Brands</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {brands.map((brand, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`brand-${brand}`}
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={() => toggleBrand(brand)}
                          />
                          <Label htmlFor={`brand-${brand}`}>{brand}</Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Price Range Filter */}
                <AccordionItem value="price">
                  <AccordionTrigger>Price Range</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>₹0</span>
                        <span>₹{maxPrice}</span>
                      </div>
                      <Slider
                        value={[maxPrice]}
                        defaultValue={[MAX_PRICE]}
                        min={0}
                        max={MAX_PRICE}
                        step={10}
                        onValueChange={handlePriceRangeChange}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Rating Filter */}
                <AccordionItem value="rating">
                  <AccordionTrigger>Rating</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`rating-${rating}`}
                            checked={ratingFilter === rating}
                            onCheckedChange={() => setRatingFilter(ratingFilter === rating ? 0 : rating)}
                          />
                          <Label htmlFor={`rating-${rating}`}>
                            {Array(rating).fill(0).map((_, i) => (
                              <span key={i} className="text-yellow-400">★</span>
                            ))}
                            {Array(5 - rating).fill(0).map((_, i) => (
                              <span key={i} className="text-gray-300">★</span>
                            ))}
                            <span className="ml-1">& up</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Availability Filter */}
                <AccordionItem value="availability">
                  <AccordionTrigger>Availability</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="in-stock"
                        checked={inStockOnly}
                        onCheckedChange={() => setInStockOnly(!inStockOnly)}
                      />
                      <Label htmlFor="in-stock">In Stock Only</Label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            {/* Products Grid */}
            <div className="flex-grow">
              {/* Results Info and Sorting */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    {selectedCategory ? selectedCategory : 'All Products'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {totalProducts} results found
                  </p>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-700 whitespace-nowrap">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="latest">Latest</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Applied Filters */}
              {(selectedCategory || searchQuery || selectedBrands.length > 0 || ratingFilter > 0 || inStockOnly) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategory && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-sm"
                      onClick={() => setSelectedCategory('')}
                    >
                      Category: {selectedCategory} <X size={14} />
                    </Button>
                  )}
                  
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-sm"
                      onClick={() => setSearchQuery('')}
                    >
                      Search: {searchQuery} <X size={14} />
                    </Button>
                  )}
                  
                  {selectedBrands.map(brand => (
                    <Button 
                      key={brand}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-sm"
                      onClick={() => toggleBrand(brand)}
                    >
                      Brand: {brand} <X size={14} />
                    </Button>
                  ))}
                  
                  {ratingFilter > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-sm"
                      onClick={() => setRatingFilter(0)}
                    >
                      Rating: {ratingFilter}+ <X size={14} />
                    </Button>
                  )}
                  
                  {inStockOnly && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-sm"
                      onClick={() => setInStockOnly(false)}
                    >
                      In Stock Only <X size={14} />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Loading State */}
              {loading ? (
                <div className="py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-4">Loading products...</p>
                </div>
              ) : (
                <>
                  {/* Products Grid */}
                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map(product => (
                        <ProductCard key={product._id} product={{
                          id: product._id,
                          _id: product._id,
                          name: product.name,
                          description: product.description,
                          price: product.price,
                          discountPrice: product.discountPrice,
                          images: product.images,
                          category: product.category,
                          subcategory: product.subcategory,
                          brand: product.brand,
                          rating: product.rating,
                          reviewCount: product.numReviews || 0,
                          stock: product.stock,
                          createdAt: product.createdAt
                        }} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-lg text-gray-500 mb-4">No products found matching your criteria.</p>
                      <Button onClick={resetFilters}>Clear All Filters</Button>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                          .map((page, index, array) => {
                            if (index > 0 && array[index - 1] !== page - 1) {
                              return (
                                <React.Fragment key={`ellipsis-${page}`}>
                                  <span className="px-2">...</span>
                                  <Button
                                    variant={currentPage === page ? "default" : "outline"}
                                    onClick={() => handlePageChange(page)}
                                  >
                                    {page}
                                  </Button>
                                </React.Fragment>
                              );
                            }
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;