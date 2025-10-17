import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../lib/types';
import { initializeSocket, disconnectSocket } from '../services/socketService';
import { SavedAddress } from '../services/addressService';
import { SavedPaymentMethod } from '../services/paymentMethodService';

type User = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  profilePicture?: string;
  registrationDate: string;
  following: Array<string | { _id?: string; id?: string }>;
  followers: Array<string | { _id?: string; id?: string }>;
  preferences?: {
    favoriteCategories: string[];
    sizes: string[];
  };
  budgetPlan?: {
    totalBudget: number;
    allocations: {
      clothing: number;
      accessories: number;
      footwear: number;
      other: number;
    };
  };
  wishlist?: string[];
  cart?: {
    items: CartItem[];
    total: number;
  };
  savedAddresses?: SavedAddress[];
  savedPaymentMethods?: SavedPaymentMethod[];
};

type CartItem = {
  _id: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
};

type Cart = {
  items: CartItem[];
  total: number;
};

type RawCartItem = Partial<CartItem> & {
  product?: Partial<Product> | null;
  quantity?: number | null;
};

type RawCart = {
  items?: Array<RawCartItem | null | undefined> | null;
  total?: number | null;
} | null | undefined;

const isRawCart = (value: unknown): value is RawCart =>
  typeof value === 'object' && value !== null;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  cart: Cart;
  login: (email: string, password: string, type?: 'user' | 'admin') => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  addToCart: (product: Product, quantity: number, selectedSize?: string, selectedColor?: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateProfilePicture: (formData: FormData) => Promise<void>;
  updateUser: (user: User) => void;
  fetchCart: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });
  const [cartInitialized, setCartInitialized] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const logoutTimerRef = useRef<number | null>(null);

  const processCartData = useCallback((cartData: unknown): Cart => {
    if (!isRawCart(cartData)) {
      return { items: [], total: 0 };
    }

    const rawItems = Array.isArray(cartData.items) ? cartData.items : [];
    const safeItems: CartItem[] = rawItems
      .filter((item): item is RawCartItem => !!item && typeof item === 'object')
      .map((item) => {
        const product = (item.product && typeof item.product === 'object') ? item.product : null;
        const images = Array.isArray(product?.images) ? (product.images as string[]) : [];
        const discountPrice = product?.discountPrice;

        const safeProduct: Product = {
          _id: product?._id ?? 'deleted-product',
          id: product?.id ?? product?._id ?? 'deleted-product',
          name: product?.name ?? '[Product Not Available]',
          description: product?.description ?? '',
          price: Number(product?.price ?? 0),
          discountPrice: typeof discountPrice === 'number' ? discountPrice : undefined,
          images,
          category: product?.category ?? '',
          brand: product?.brand ?? '',
          rating: typeof product?.rating === 'number' ? product.rating : 0,
          reviewCount: typeof product?.reviewCount === 'number' ? product.reviewCount : 0,
          stock: typeof product?.stock === 'number' ? product.stock : 0,
          createdAt: product?.createdAt ?? '',
        };

        return {
          _id: typeof item._id === 'string' && item._id.length > 0 ? item._id : `${safeProduct._id}-cart-item`,
          product: safeProduct,
          quantity: Number(item.quantity ?? 1) || 1,
          selectedColor: item.selectedColor ?? undefined,
          selectedSize: item.selectedSize ?? undefined,
        };
      });

    const total = typeof cartData.total === 'number' ? cartData.total : 0;

    return {
      items: safeItems,
      total,
    };
  }, []);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsCartLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBaseUrl}/auth/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cart request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        setCart(processCartData(data.cart));
      } else {
        throw new Error(data.message || 'Cart response indicated failure');
      }
    } catch (error) {
      console.error("Cart load error:", error);
    } finally {
      setIsCartLoading(false);
    }
  }, [isAuthenticated, processCartData]);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current !== null) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearLogoutTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    setIsAuthenticated(false);
    setCart({ items: [], total: 0 });
    setCartInitialized(false);
    disconnectSocket();
  }, [clearLogoutTimer]);

  const scheduleAutoLogout = useCallback((expiryTimestamp: number) => {
    clearLogoutTimer();
    const remaining = expiryTimestamp - Date.now();

    if (remaining <= 0) {
      logout();
      return;
    }

    logoutTimerRef.current = window.setTimeout(() => {
      logout();
    }, remaining);
  }, [clearLogoutTimer, logout]);

  const addToCart = async (product: Product, quantity: number, selectedSize?: string, selectedColor?: string) => {
    try {
      if (!isAuthenticated) {
        // Guest cart logic
        return;
      }

      const productId = product._id ?? product.id;
      if (!productId) {
        throw new Error('Product identifier is missing');
      }
  
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
  
      const response = await fetch('http://localhost:5000/api/auth/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          quantity,
          selectedSize,
          selectedColor
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add to cart');
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to add to cart');
      
      const processedCart = processCartData(data.cart);
      setCart(processedCart);
      
      if (user) {
        const updatedUser = { ...user, cart: data.cart };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      if (!isAuthenticated) {
        // Guest cart logic
        const filteredItems = cart.items.filter(item => item._id !== itemId);
        const newTotal = filteredItems.reduce(
          (sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity),
          0
        );
        setCart({ items: filteredItems, total: newTotal });
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('http://localhost:5000/api/auth/cart/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });

      if (!response.ok) throw new Error('Failed to remove from cart');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to remove from cart');

      const processedCart = processCartData(data.cart);
      setCart(processedCart);
      
      if (user) {
        const updatedUser = { ...user, cart: data.cart };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (!isAuthenticated) {
        // Guest cart logic
        const updatedItems = cart.items.map(item => 
          item._id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
        );
        const newTotal = updatedItems.reduce(
          (sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity),
          0
        );
        setCart({ items: updatedItems, total: newTotal });
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('http://localhost:5000/api/auth/cart/update-quantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, quantity })
      });

      if (!response.ok) throw new Error('Failed to update quantity');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update quantity');

      const processedCart = processCartData(data.cart);
      setCart(processedCart);
      
      if (user) {
        const updatedUser = { ...user, cart: data.cart };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      if (!isAuthenticated) {
        setCart({ items: [], total: 0 });
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('http://localhost:5000/api/auth/cart/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to clear cart');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to clear cart');

      setCart({ items: [], total: 0 });
      
      if (user) {
        const updatedUser = { ...user, cart: { items: [], total: 0 } };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string, type: 'user' | 'admin' = 'user') => {
    setIsLoading(true);
    try {
      const endpoint = type === 'admin' 
        ? 'http://localhost:5000/api/auth/admin/login' 
        : 'http://localhost:5000/api/auth/login';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Login failed');

      const processedCart = processCartData(data.user.cart);

      const userData: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        profilePicture: data.user.profilePicture || undefined,
        registrationDate: data.user.registrationDate,
        following: data.user.following || [], // Add this
        followers: data.user.followers || [], // Add this
        preferences: data.user.preferences || {
          favoriteCategories: [],
          sizes: []
        },
        budgetPlan: data.user.budgetPlan || {
          totalBudget: 0,
          allocations: {
            clothing: 0,
            accessories: 0,
            footwear: 0,
            other: 0
          }
        },
        wishlist: data.user.wishlist || [],
        cart: data.user.cart,
        savedAddresses: data.user.savedAddresses || [],
        savedPaymentMethods: data.user.savedPaymentMethods || []
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));
  const expiryTimestamp = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem('tokenExpiry', expiryTimestamp.toString());
      setUser(userData);
      setIsAuthenticated(true);
      setCart(processedCart);
      setCartInitialized(true);

  scheduleAutoLogout(expiryTimestamp);

      // Initialize socket after successful login
      initializeSocket(data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) throw new Error('Registration failed');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Registration failed');

      const userData: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        registrationDate: data.user.registrationDate,
        following: data.user.following || [], // Add this
        followers: data.user.followers || [], // Add this
        preferences: data.user.preferences || {
          favoriteCategories: [],
          sizes: []
        },
        budgetPlan: data.user.budgetPlan || {
          totalBudget: 0,
          allocations: {
            clothing: 0,
            accessories: 0,
            footwear: 0,
            other: 0
          }
        },
        cart: { items: [], total: 0 },
        savedAddresses: data.user.savedAddresses || [],
        savedPaymentMethods: data.user.savedPaymentMethods || []
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));
  const expiryTimestamp = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem('tokenExpiry', expiryTimestamp.toString());
      setUser(userData);
      setIsAuthenticated(true);
      setCart({ items: [], total: 0 });
      setCartInitialized(true);

  scheduleAutoLogout(expiryTimestamp);

      // Initialize socket after successful registration
      initializeSocket(data.token);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Profile update failed');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Profile update failed');

      const updatedUser = { 
        ...user, 
        ...data.user,
        cart: data.user.cart || user?.cart,
        savedAddresses: data.user.savedAddresses || user?.savedAddresses,
        savedPaymentMethods: data.user.savedPaymentMethods || user?.savedPaymentMethods
      } as User;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfilePicture = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/auth/profile/picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Profile picture update failed');

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Profile picture update failed');

      const refreshedUser = data.user as User;
      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      if (refreshedUser.cart) {
        setCart(processCartData(refreshedUser.cart));
      }
    } catch (error) {
      console.error('Profile picture update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        
        if (token && userData && tokenExpiry) {
          try {
            const parsedUser = JSON.parse(userData);
            const expiryTimestamp = Number(tokenExpiry);

            if (!Number.isFinite(expiryTimestamp) || expiryTimestamp <= Date.now()) {
              logout();
              return;
            }

            setUser(parsedUser);
            setIsAuthenticated(true);
            
            if (parsedUser.cart) {
              const initialCart = processCartData(parsedUser.cart);
              setCart(initialCart);
            }

            scheduleAutoLogout(expiryTimestamp);

            // Initialize socket if token exists
            initializeSocket(token);
          } catch (parseError) {
            console.error('Failed to parse user data:', parseError);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('tokenExpiry');
          }
        } else if (token || userData || tokenExpiry) {
          // Clean up incomplete session artifacts
          logout();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');
        setUser(null);
        setIsAuthenticated(false);
        setCart({ items: [], total: 0 });
      } finally {
        setIsLoading(false);
      }
    };
  
    initializeAuth();
  }, [processCartData, logout, scheduleAutoLogout]);

  const [cartFetched, setCartFetched] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !cartFetched) {
      fetchCart();
      setCartFetched(true);
    }
  }, [isAuthenticated, cartFetched, fetchCart]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        cart,
        login,
        logout,
        register,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        updateProfile,
        updateProfilePicture,
        updateUser,
        fetchCart,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};