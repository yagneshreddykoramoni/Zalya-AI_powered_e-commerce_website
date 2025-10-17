
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import Footer from '../components/Footer';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="text-center px-4">
          <h1 className="text-6xl md:text-9xl font-bold text-brand-600 mb-4">404</h1>
          <h2 className="text-3xl font-bold mb-6">Page Not Found</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              <Link to="/">Go to Homepage</Link>
            </Button>
            <Button variant="outline" size="lg">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
