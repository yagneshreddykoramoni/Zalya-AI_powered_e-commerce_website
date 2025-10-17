
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Package, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 justify-between">
          <h1 className="text-xl font-bold text-gray-900">📊DASHBOARD</h1>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminNavBar;
