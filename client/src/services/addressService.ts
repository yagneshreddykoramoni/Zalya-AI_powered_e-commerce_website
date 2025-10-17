import api from './api';

export interface SavedAddress {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveAddressPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault?: boolean;
}

interface SaveAddressResponse {
  success: boolean;
  address: SavedAddress;
  addresses: SavedAddress[];
  message?: string;
}

export const fetchSavedAddresses = async (): Promise<SavedAddress[]> => {
  const { data } = await api.get<{ success: boolean; addresses: SavedAddress[] }>('/auth/addresses');
  return data.addresses || [];
};

export const saveAddress = async (payload: SaveAddressPayload): Promise<SaveAddressResponse> => {
  const { data } = await api.post<SaveAddressResponse>('/auth/addresses', payload);
  return data;
};
