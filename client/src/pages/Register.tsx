
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/profile" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create an Account</h1>
            <p className="text-muted-foreground mt-2">Join our community of shoppers</p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <RegisterForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
