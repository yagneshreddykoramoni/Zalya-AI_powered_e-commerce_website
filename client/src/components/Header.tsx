import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, ShoppingCart, User, X, BookmarkCheck } from 'lucide-react';
import { Button } from './ui/button';
import SearchBar from './SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBadge from './NotificationBadge';

const Header: React.FC = () => {
  const { isAuthenticated, cart = { items: [] }, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safely calculate total items
  const uniqueProductsCount = (cart?.items || []).length;

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Community', path: '/community' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold text-brand-600">
              ZalyaStore
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 ml-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isActive(item.path)
                    ? 'text-brand-700 bg-brand-50'
                    : 'text-gray-700 hover:text-brand-600 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search bar */}
          <div className="hidden md:flex flex-grow mx-4">
            <SearchBar />
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-1">
            {isAuthenticated && <NotificationBadge />}

            {/* Wishlist */}
            {isAuthenticated && user && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/wishlist')}
                aria-label="Wishlist"
                className="relative"
              >
                <BookmarkCheck size={20} />
                {user.wishlist?.length > 0 && (
                  <div className="absolute -top-0 -right-2 transform -translate-x-1/2 w-4 h-4 bg-brand-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{user.wishlist.length}</span>
                  </div>
                )}
              </Button>
            )}

            {/* User account */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}
              aria-label="User account"
            >
              <User size={20} />
            </Button>

            {/* Cart icon */}
            {isAuthenticated && user && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/cart')}
              aria-label="Shopping cart"
            >
              <ShoppingCart size={20} />
              {uniqueProductsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{uniqueProductsCount}</span>
                </div>
              )}
            </Button>
          )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t py-2">
            <div className="px-2 pt-2 pb-4 space-y-3">
              {/* Mobile search */}
              <div className="mb-4">
                <SearchBar />
              </div>
              
              {/* Mobile nav links */}
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(item.path)
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-brand-600'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;