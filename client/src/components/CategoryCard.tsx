
import React from 'react';
import { Link } from 'react-router-dom';
import { Category } from '../lib/types';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link to={`/category/${category.id}`} className="block">
      <div className="relative rounded-lg overflow-hidden group">
        <div className="aspect-square">
          <img
            src={category.image}
            alt={category.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
          <h3 className="text-white font-semibold text-lg">{category.name}</h3>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
