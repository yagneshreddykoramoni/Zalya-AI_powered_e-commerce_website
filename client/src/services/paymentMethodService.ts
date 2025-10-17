import api from './api';

export interface SavedPaymentMethod {
  id: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
}

export interface SavePaymentMethodPayload {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
}

interface SavePaymentMethodResponse {
  success: boolean;
  paymentMethod: SavedPaymentMethod;
  paymentMethods: SavedPaymentMethod[];
  message?: string;
}

export const fetchSavedPaymentMethods = async (): Promise<SavedPaymentMethod[]> => {
  const { data } = await api.get<{ success: boolean; paymentMethods: SavedPaymentMethod[] }>('/auth/payment-methods');
  return data.paymentMethods || [];
};

export const savePaymentMethod = async (payload: SavePaymentMethodPayload): Promise<SavePaymentMethodResponse> => {
  const { data } = await api.post<SavePaymentMethodResponse>('/auth/payment-methods', payload);
  return data;
};
