
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';

interface RecommendedProductsProps {
  title: string;
  products: Product[];
  viewMoreLink?: string;
}

const RecommendedProducts: React.FC<RecommendedProductsProps> = ({ 
  title, 
  products,
  viewMoreLink = '/products'
}) => {
  if (!products.length) return null;
  
  return (
    <div className="mt-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        {viewMoreLink && (
          <Link to={viewMoreLink} className="text-brand-600 hover:text-brand-700 flex items-center">
            View More <ArrowRight size={16} className="ml-1" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product._id ?? product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default RecommendedProducts;
