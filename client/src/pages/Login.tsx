
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

const Login = () => {
  const { isAuthenticated, user } = useAuth();
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [loginType, setLoginType] = useState<'user' | 'admin'>('user');

  // Redirect based on user role
  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/profile" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-10 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">Login to your account</p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6 border border-gray-100">
            <Tabs defaultValue="user" onValueChange={(value) => setLoginType(value as 'user' | 'admin')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="user">User Login</TabsTrigger>
                <TabsTrigger value="admin">Admin Login</TabsTrigger>
              </TabsList>
              <TabsContent value="user" className="pt-4">
                <LoginForm loginType="user" />
              </TabsContent>
              <TabsContent value="admin" className="pt-4">
                <LoginForm loginType="admin" />
              </TabsContent>
            </Tabs>
            
            <div className="text-center space-y-4">
              <div className="border-t pt-4">
                <p className="text-muted-foreground">
                  Don't have an account? <Link to="/register" className="text-brand-600 hover:underline">Register here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
