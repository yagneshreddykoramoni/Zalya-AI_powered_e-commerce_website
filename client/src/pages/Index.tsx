
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { mockProducts } from '../lib/mockData';
import PersonalizedRecommendations from '@/components/recommendations/PersonalizedRecommendations';
import productService from '../services/productService';
import { Product } from '../lib/types';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch real products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Fetch products with different criteria for featured and trending
        const [featuredResponse, trendingResponse] = await Promise.all([
          // Featured products: high-rated products (rating >= 4.5)
          productService.getProducts({ 
            minRating: 4.5, 
            sort: 'rating', 
            limit: 4 
          }),
          // Trending products: based on real user data analysis (orders, reviews, ratings)
          productService.getTrendingProducts({ 
            limit: 8 
          })
        ]);

        // Process featured products response
        let featured = [];
        if (featuredResponse?.products) {
          featured = featuredResponse.products;
        } else if (Array.isArray(featuredResponse?.data)) {
          featured = featuredResponse.data;
        } else if (Array.isArray(featuredResponse)) {
          featured = featuredResponse;
        }

        // Process trending products response
        let trending = [];
        if (trendingResponse?.products) {
          trending = trendingResponse.products;
        } else if (Array.isArray(trendingResponse?.data)) {
          trending = trendingResponse.data;
        } else if (Array.isArray(trendingResponse)) {
          trending = trendingResponse;
        }

        // Define database product interface
        interface DbProduct {
          _id: string;
          id?: string;
          name: string;
          description: string;
          price: number;
          discountPrice?: number;
          images: string[];
          category: string;
          subcategory?: string;
          brand: string;
          rating: number;
          reviewCount?: number;
          numReviews?: number;
          stock: number;
          createdAt: string;
        }

        // Convert database products to match our Product interface
        const formatProduct = (dbProduct: DbProduct): Product => ({
          id: dbProduct._id || dbProduct.id || '',
          _id: dbProduct._id || dbProduct.id,
          name: dbProduct.name,
          description: dbProduct.description,
          price: dbProduct.price,
          discountPrice: dbProduct.discountPrice,
          images: dbProduct.images,
          category: dbProduct.category,
          subcategory: dbProduct.subcategory,
          brand: dbProduct.brand,
          rating: dbProduct.rating || 4.0,
          reviewCount: dbProduct.reviewCount || dbProduct.numReviews || 0,
          stock: dbProduct.stock,
          createdAt: dbProduct.createdAt
        });

        setFeaturedProducts(featured.map(formatProduct));
        setTrendingProducts(trending.map(formatProduct));

      } catch (error) {
        console.error('Error fetching products:', error);
        
        // Fallback to mock data if database fetch fails
        const mockFeatured = mockProducts.filter(product => product.rating >= 4.5).slice(0, 4);
        const mockTrending = mockProducts
          .sort((a, b) => {
            // Sort by a combination of rating and review count for trending effect
            const aScore = a.rating * 20 + a.reviewCount * 2;
            const bScore = b.rating * 20 + b.reviewCount * 2;
            return bScore - aScore;
          })
          .slice(0, 8);
        
        setFeaturedProducts(mockFeatured);
        setTrendingProducts(mockTrending);
        
        toast({
          title: "Using sample data",
          description: "Could not fetch products from server, showing sample products",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Your Perfect Style</h1>
              <p className="text-lg md:text-xl mb-6">
                Shop the latest trends with personalized recommendations
                tailored just for you.
              </p>
              <div className="flex space-x-4">
                <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                  <Link to="/products">Shop Now</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                  <Link to="/community">Join Community</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Personalized Recommendations Section - updated name from "Popular Items" */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <PersonalizedRecommendations />
          </div>
        </section>

        {/* Trending Now section - showing 8 products based on real user analytics */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">Trending Now</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Based on recent purchases, ratings, and user engagement
                </p>
              </div>
              <Link to="/products" className="text-purple-600 hover:text-purple-700 flex items-center">
                View All Products <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-300 rounded-lg h-64 mb-4"></div>
                    <div className="bg-gray-300 h-4 rounded mb-2"></div>
                    <div className="bg-gray-300 h-4 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {trendingProducts.map(product => (
                  <ProductCard key={product._id ?? product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Banner Section */}
        <section className="py-12 bg-purple-100">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Get 15% Off Your First Order</h2>
                <p className="mb-4">Sign up for our newsletter and receive exclusive offers!</p>
                <form className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="px-4 py-2 rounded-l-md w-full text-gray-900 focus:outline-none"
                  />
                  <Button type="submit" className="rounded-l-none">Subscribe</Button>
                </form>
              </div>
              <div className="hidden md:block">
                <img
                  src="https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=200&q=80"
                  alt="Special Offer"
                  className="rounded-lg"
                  width={200}
                  height={200}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
