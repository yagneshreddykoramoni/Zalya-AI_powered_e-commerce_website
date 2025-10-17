export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  preferences: {
    categories: string[];
    sizes: string[];
    brands: string[];
  };
  createdAt: string;
  orders?: Order[];
  wishlist: string[]; // Array of product IDs in user's wishlist - Making this non-optional
  following?: Array<string | { _id?: string; id?: string }>;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  brand: string;
  rating: number;
  reviewCount: number;
  colors?: string[];
  sizes?: string[];
  tags?: string[];
  stock: number;
  createdAt: string;
  styleType?: string;
  occasion?: string[];
  season?: string[];
  fitType?: string;
  material?: string;
}

export interface CartItem {
  _id: string;
  product: {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    images: string[];
  };
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  subcategories?: string[];
}

export interface OrderItem {
  product: {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    images: string[];
  };
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  taxAmount: number;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wishlist?: Product[]; // User's wishlist products
}
