import api from './api';
import axios from 'axios'; // Add this import

export interface OrderProduct {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    images: string[];
}

export interface OrderItem {
    product: OrderProduct;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
}

interface OrderProductPayload {
    product: {
        _id: string;
    };
    quantity: number;
}

export interface Order {
    id: string;
    userId?: string;
    items: OrderItem[];
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total: number;
    subtotal: number;
    taxAmount: number;
    createdAt: string;
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentMethod: string;
    paymentDisplayName?: string;
    paymentDetails?: {
        type?: string;
        savedPaymentMethodId?: string;
        card?: {
            brand?: string;
            last4?: string;
            cardholderName?: string;
            expiryMonth?: number;
            expiryYear?: number;
        };
        upi?: {
            appName?: string;
            vpa?: string;
            transactionReference?: string;
            status?: 'pending' | 'initiated' | 'paid' | 'failed';
            intentUrl?: string;
            paidAt?: string;
        };
        wallet?: {
            provider?: string;
            accountEmail?: string;
        };
        notes?: string;
    };
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
}

interface CreateOrderData {
    firstName: string;
    lastName: string;
    user: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    paymentMethod: string;
    savedPaymentMethodId?: string;
    cardNumber?: string;
    cardName?: string;
    expiryDate?: string;
    upiApp?: string;
    upiTransactionId?: string;
    upiVpa?: string;
    upiStatus?: 'pending' | 'initiated' | 'paid' | 'failed';
    upiIntentUrl?: string;
    items: OrderProductPayload[];
    subtotal: number;
    tax: number;
    total: number;
}

export const createOrder = async (orderData: CreateOrderData) => {
    try {
        // Ensure user ID is included
        const payload = {
            ...orderData,
            user: orderData.user // Make sure this isn't undefined
        };
        const response = await api.post('/orders', payload); // Use payload instead of orderData
        
        if (response.headers['content-type']?.includes('text/html')) {
            throw new Error('Server returned HTML instead of JSON');
        }
        
        if (!response.data.success) {
            throw new Error(response.data.message || 'Order failed');
        }
        
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

export const getUserOrders = async (): Promise<{ success: boolean; orders: Order[] }> => {
    try {
        const response = await api.get('/orders');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        throw error;
    }
};

export const getOrderDetails = async (orderId: string): Promise<{ success: boolean; order: Order }> => {
    try {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error;
    }
};