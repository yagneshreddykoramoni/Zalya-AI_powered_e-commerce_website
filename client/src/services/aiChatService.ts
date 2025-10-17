import api, { API_BASE_URL } from './api';

// Types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  image?: string;
  products?: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
  }>;
}

export interface ChatRequest {
  query: string;
  chatHistory?: ChatMessage[];
  productId?: string;
}

export interface ChatIntent {
  gender?: string;
  occasion?: string | null;
  styleDescriptors?: string[];
  priorityColors?: string[];
  needsFullOutfit?: boolean;
}

export interface RecommendedProduct {
  slot: string;
  label: string;
  searchType: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  subcategory?: string;
  brand: string;
  images?: string[];
  colors?: string[];
  tags?: string[];
  stock: number;
  rating?: number;
  link: string;
  matchReasons?: string[];
}

export interface CostBreakdownItem {
  slot: string;
  label: string;
  name: string;
  price: number;
  discountPrice?: number;
  finalPrice: number;
  link: string;
  formattedFinalPrice: string;
}

export interface CostBreakdown {
  currency: string;
  items: CostBreakdownItem[];
  total: number;
  formattedTotal: string;
}

export interface ChatResponse {
  message: string;
  products: Array<{
    _id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    category: string;
    subcategory?: string;
    brand: string;
    images?: string[];
    rating?: number;
    stock: number;
  }>;
  recommendedProducts?: RecommendedProduct[];
  costBreakdown?: CostBreakdown | null;
  intent?: ChatIntent;
}

export interface OutfitSuggestionsResponse {
  mainProduct: Record<string, unknown>;
  outfitItems: {
    [category: string]: Array<Record<string, unknown>>;
  };
}

export interface FashionRecognitionRequest {
  image: string;
}

export interface FashionRecognitionResponse {
  message: string;
  analysis: Array<{
    type: string;
    color?: string;
    gender?: string;
    [key: string]: unknown;
  }>;
  recommendations: string;
  recommendedProducts: Array<{
    _id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    category: string;
    subcategory?: string;
    brand: string;
    image?: string | null;
    images?: string[];
    colors?: string[];
    tags?: string[];
    stock: number;
    link: string;
    matchReasons?: string[];
  }>;
  detectedItem?: string;
  detectedGender?: string;
  rawCaption?: string;
}

const aiChatService = {
  /**
   * Send a chat message to the AI assistant
   */
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    try {
      console.log('Sending chat request to AI:', request);

      const { data } = await api.post('/ai/chat', request);
      console.log('Received AI response:', data);
      return data;
    } catch (error) {
      console.error('Error sending message to AI:', error);
      // Log more details about the error
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      throw error;
    }
  },

  /**
   * Get outfit suggestions based on a product
   */
  getOutfitSuggestions: async (productId: string): Promise<OutfitSuggestionsResponse> => {
    try {
      const response = await api.get(`/ai/outfit-suggestions/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting outfit suggestions:', error);
      throw error;
    }
  },

  /**
   * Analyze fashion image and get outfit recommendations
   */
  fashionRecognition: async (request: FashionRecognitionRequest): Promise<FashionRecognitionResponse> => {
    try {
      const endpoint = `${API_BASE_URL}/ai/fashion`;
      const formData = new FormData();

      const base64Data = request.image.startsWith('data:')
        ? request.image.split(',')[1]
        : request.image;

      const mimeMatch = request.image.match(/^data:(.*?);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        array[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([array], { type: mimeType });
      formData.append('image', blob, `upload.${mimeType.split('/')[1] || 'png'}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in fashion recognition:', error);
      throw error;
    }
  }
};

export default aiChatService;
