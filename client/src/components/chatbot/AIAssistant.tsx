import React, { useState, useRef, useEffect, useCallback } from 'react';
import { message, Spin } from 'antd';
import { MessageSquare, Send, X, Mic, MicOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import aiChatService, { ChatMessage, FashionRecognitionResponse } from '@/services/aiChatService';
import { API_BASE_URL } from '@/services/api';
import { getImageUrl } from '@/lib/utils';

type OutfitPlanProduct = {
  id: string;
  slot: string;
  label: string;
  name: string;
  image?: string;
  price: number;
  discountPrice?: number;
  brand?: string;
  link: string;
  matchReasons?: string[];
};

type OutfitCostBreakdownItem = {
  slot: string;
  label: string;
  name: string;
  formattedFinalPrice: string;
  finalPrice: number;
  link: string;
};

type OutfitPlan = {
  recommendedProducts: OutfitPlanProduct[];
  costBreakdown?: {
    items: OutfitCostBreakdownItem[];
    formattedTotal: string;
    currency: string;
  };
  intent?: {
    gender?: string;
    occasion?: string | null;
    styleDescriptors?: string[];
    priorityColors?: string[];
  };
};

type Message = {
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
  fashionData?: {
    detectedItem: string;
  outfitPlan?: OutfitPlan;
    detectedColor?: string;
    detectedGender: string;
    confidence?: number;
    recommendationMessage: string;
    recommendedProducts: Array<{
      id: string;
      name: string;
      image?: string | null;
      price: number;
      discountPrice?: number;
      brand?: string;
      link: string;
      colors?: string[];
      tags?: string[];
      matchReasons?: string[];
    }>;
    rawCaption?: string;
  };
};

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your fashion assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Speech recognition setup
  const recognition = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true; // Keep listening until manually stopped
      recognition.current.interimResults = false; // Only get final results
      recognition.current.lang = 'en-US'; // Set language for better accuracy

      if (recognition.current) {
        recognition.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          setInput(prevInput => prevInput + transcript); // Append to existing input
        };

        recognition.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            message.error('Microphone access denied. Please allow microphone access to use voice input.');
          } else if (event.error === 'no-speech') {
            message.info('No speech detected. Please try speaking again.');
          } else {
            message.error('Voice recognition error. Please try again.');
          }
        };

        recognition.current.onend = () => {
          setIsListening(false);
        };

        recognition.current.onstart = () => {
          setIsListening(true);
        };
      }
    }
  }, []);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
      message.success('Voice input stopped');
    } else {
      if (recognition.current) {
        try {
          recognition.current.start();
          message.info('Listening... Click the microphone again to stop');
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          message.error('Failed to start voice recognition. Please try again.');
        }
      } else {
        message.error('Voice input is not supported in your browser. Please use a modern browser like Chrome, Edge, or Safari.');
      }
    }
  }, [isListening]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        setUploadedImage(imageUrl);
        
        // Create a user message with the uploaded image
        const userMessage: Message = {
          id: Date.now().toString(),
          text: "I uploaded a fashion item photo. Can you analyze it and suggest outfit recommendations?",
          sender: 'user',
          timestamp: new Date(),
          image: imageUrl
        };
        
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        
        try {
          const formData = new FormData();
          formData.append('image', file); // Use the file object directly

          // Call fashion recognition API
          const fetchResponse = await fetch(`${API_BASE_URL}/ai/fashion`, {
            method: 'POST',
            body: formData, // Send as multipart/form-data
            // Do NOT set Content-Type header, browser does it automatically for FormData
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`HTTP error! status: ${fetchResponse.status}`);
          }
          
          const response: FashionRecognitionResponse = await fetchResponse.json();
          console.log('Received from server:', JSON.stringify(response, null, 2)); // DEBUGGING

          const descriptions = Array.isArray(response.analysis)
            ? response.analysis.map((item) => `${item.color ?? ''} ${item.type}`.trim()).join(', ')
            : 'a stylish fit';

          const primaryDetection = Array.isArray(response.analysis) && response.analysis.length > 0
            ? response.analysis[0]
            : null;

          const detectedItem = response.detectedItem || primaryDetection?.type || descriptions || 'fashion item';
          const detectedColor = primaryDetection?.color;
          const detectedGender = response.detectedGender || primaryDetection?.gender || 'unisex';
          const recommendationMessage = response.recommendations || 'Here are a few looks you can shop right now.';

          const recommendedProducts = Array.isArray(response.recommendedProducts)
            ? response.recommendedProducts.map((product) => {
                const primaryImage = product.image || (product.images && product.images.length > 0 ? product.images[0] : undefined);
                return {
                  id: product._id,
                  name: product.name,
                  image: primaryImage ? getImageUrl(primaryImage) : '/placeholder.svg',
                  price: product.price,
                  discountPrice: product.discountPrice,
                  brand: product.brand,
                  link: product.link || `/product/${product._id}`,
                  colors: product.colors,
                  tags: product.tags,
                  matchReasons: product.matchReasons
                };
              })
            : [];

          const detectedSummary = detectedColor ? `${detectedColor} ${detectedItem}` : detectedItem;

          // Create bot response message with fashion data
          const botResponse: Message = {
            id: Date.now().toString(),
            text: `Based on the image, I see: ${descriptions}.\n\nHere are some outfit ideas tailored for your ${detectedSummary}.`,
            sender: 'bot',
            timestamp: new Date(),
            fashionData: {
              detectedItem,
              detectedColor,
              detectedGender,
              recommendationMessage,
              recommendedProducts,
              rawCaption: response.rawCaption
            }
          };
          
          setMessages(prev => [...prev, botResponse]);
        } catch (error) {
          console.error('Error in fashion recognition:', error);
          message.error('Sorry, I encountered an error analyzing your image. Please try again.');
          
          // Fallback response in case of error
          const errorResponse: Message = {
            id: Date.now().toString(),
            text: 'I apologize, but I\'m having trouble analyzing your fashion image right now. Please try again later.',
            sender: 'bot',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorResponse]);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      image: uploadedImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = uploadedImage;
    setInput('');
    setUploadedImage(null);
    setIsLoading(true);
    
    try {
      console.log('Preparing to send message to AI service');
      
      // If there's an image, use fashion recognition API
      if (currentImage) {
        const base64Image = currentImage.split(',')[1];
        
  const fetchResponse = await fetch(`${API_BASE_URL}/ai/fashion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: base64Image
          })
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }
        
  const response: FashionRecognitionResponse = await fetchResponse.json();

        const primaryDetection = Array.isArray(response.analysis) && response.analysis.length > 0
          ? response.analysis[0]
          : null;

        const detectedItem = response.detectedItem || primaryDetection?.type || 'fashion item';
        const detectedColor = primaryDetection?.color;
        const detectedGender = response.detectedGender || primaryDetection?.gender || 'unisex';
        const recommendationMessage = response.recommendations || 'Here are a few looks you can shop right now.';

    const recommendedProducts = Array.isArray(response.recommendedProducts)
      ? response.recommendedProducts.map((product) => {
        const primaryImage = product.image || (product.images && product.images.length > 0 ? product.images[0] : undefined);
              return {
          id: product._id,
          name: product.name,
          image: primaryImage ? getImageUrl(primaryImage) : '/placeholder.svg',
          price: product.price,
          discountPrice: product.discountPrice,
          brand: product.brand,
          link: product.link || `/product/${product._id}`,
          colors: product.colors,
          tags: product.tags,
          matchReasons: product.matchReasons
              };
          })
          : [];

        const detectedSummary = detectedColor ? `${detectedColor} ${detectedItem}` : detectedItem;

        const botResponse: Message = {
          id: Date.now().toString(),
          text: currentInput
            ? `${currentInput}\n\nI spotted: **${detectedSummary}** (${detectedGender}).\n\nWant to try these?`
            : `I spotted: **${detectedSummary}** (${detectedGender}).\n\nWant to try these?`,
          sender: 'bot',
          timestamp: new Date(),
          fashionData: {
            detectedItem,
            detectedColor,
            detectedGender,
            recommendationMessage,
            recommendedProducts,
            rawCaption: response.rawCaption
          }
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Regular chat API for text-only messages
        const chatHistory = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp,
          image: msg.image,
        }));
        
  const fetchResponse = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: currentInput,
            chatHistory: chatHistory
          })
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }
        
        const response = await fetchResponse.json();
        
        console.log('Response received from AI:', response);
        const mappedProducts = Array.isArray(response.products)
          ? response.products.map((product) => ({
              id: product._id,
              name: product.name,
              image: product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : '/placeholder.svg',
              price: product.discountPrice || product.price,
            }))
          : [];

        const recommendedProducts = Array.isArray(response.recommendedProducts)
          ? response.recommendedProducts.map((product) => {
              const primaryImage = product.images && product.images.length > 0 ? product.images[0] : undefined;
              return {
                id: product._id,
                slot: product.slot,
                label: product.label,
                name: product.name,
                image: primaryImage ? getImageUrl(primaryImage) : '/placeholder.svg',
                price: product.price,
                discountPrice: product.discountPrice,
                brand: product.brand,
                link: product.link || `/product/${product._id}`,
                matchReasons: product.matchReasons,
              };
            })
          : [];

        const costBreakdown = response.costBreakdown && Array.isArray(response.costBreakdown.items)
          ? {
              items: response.costBreakdown.items.map((item) => ({
                slot: item.slot,
                label: item.label,
                name: item.name,
                formattedFinalPrice: item.formattedFinalPrice,
                finalPrice: item.finalPrice,
                link: item.link,
              })),
              formattedTotal: response.costBreakdown.formattedTotal,
              currency: response.costBreakdown.currency,
            }
          : undefined;

        const intentMeta = response.intent && typeof response.intent === 'object'
          ? {
              gender: response.intent.gender,
              occasion: response.intent.occasion,
              styleDescriptors: response.intent.styleDescriptors,
              priorityColors: response.intent.priorityColors,
            }
          : undefined;

        const botResponse: Message = {
          id: Date.now().toString(),
          text: response.message,
          sender: 'bot',
          timestamp: new Date(),
          products: mappedProducts,
          outfitPlan: recommendedProducts.length > 0
            ? {
                recommendedProducts,
                costBreakdown,
                intent: intentMeta,
              }
            : undefined,
        };

        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      message.error('Sorry, I encountered an error. Please try again.');
      
      const errorResponse: Message = {
        id: Date.now().toString(),
        text: 'I apologize, but I\'m having trouble connecting to the AI service. Please try again in a moment.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Add keyboard shortcut for voice input (Ctrl/Cmd + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        toggleVoiceInput();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleVoiceInput]);

  return (
    <>
      {/* Floating chat button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-5 right-5 rounded-full w-12 h-12 shadow-lg flex items-center justify-center ${
          isOpen ? 'bg-gray-700' : 'bg-brand-600 hover:bg-brand-700'
        } z-50`}
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </Button>
      
      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-5 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50">
          <div className="bg-brand-600 text-white p-3 font-semibold rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span>Fashion Assistant</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 text-white hover:bg-brand-700 rounded-full"
            >
              <X size={16} />
            </Button>
          </div>
          
          <ScrollArea className="flex-grow p-3 bg-gray-50">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    
                    {msg.image && (
                      <div className="mt-2 rounded overflow-hidden">
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="max-w-full h-auto"
                        />
                      </div>
                    )}
                    
                    {msg.fashionData && (
                      <div className="mt-3 space-y-2">
                        <div className="bg-white p-2 rounded border">
                          <p className="text-sm font-medium text-gray-900">Detected Item:</p>
                          <p className="text-sm text-gray-700">{msg.fashionData.detectedItem}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">Gender: {msg.fashionData.detectedGender}</p>
                            {msg.fashionData.confidence && (
                              <p className="text-xs text-gray-500">
                                Confidence: {(msg.fashionData.confidence * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                        {msg.fashionData.rawCaption && (
                          <div className="bg-gray-50 p-2 rounded border">
                            <p className="text-xs font-medium text-gray-600">AI Caption:</p>
                            <p className="text-xs text-gray-500 italic">"{msg.fashionData.rawCaption}"</p>
                          </div>
                        )}
                        <div className="bg-white p-2 rounded border">
                          <p className="text-sm font-medium text-gray-900 mb-2">Outfit Recommendations:</p>
                          {msg.fashionData.recommendationMessage && (
                            <p className="text-sm text-gray-700 whitespace-pre-line">{msg.fashionData.recommendationMessage}</p>
                          )}
                          {msg.fashionData.recommendedProducts.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {msg.fashionData.recommendedProducts.map((product) => (
                                <Link
                                  key={product.id}
                                  to={product.link}
                                  className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors p-2 rounded border"
                                >
                                  <img
                                    src={product.image || '/placeholder.svg'}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                    {product.brand && (
                                      <p className="text-xs text-gray-500">{product.brand}</p>
                                    )}
                                    <p className="text-xs font-semibold text-green-600">
                                      ₹{(product.discountPrice ?? product.price).toLocaleString('en-IN')}
                                    </p>
                                    {product.matchReasons && product.matchReasons.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {product.matchReasons.map((reason) => (
                                          <span
                                            key={`${product.id}-${reason}`}
                                            className="text-[10px] uppercase tracking-wide bg-brand-100 text-brand-700 px-2 py-0.5 rounded"
                                          >
                                            #{reason}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">I'm still looking for the perfect matches in your store.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {msg.outfitPlan && (
                      <div className="mt-3 space-y-2">
                        <div className="bg-white p-2 rounded border space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">Curated Outfit</p>
                            <div className="flex flex-wrap gap-1">
                              {msg.outfitPlan.intent?.occasion && (
                                <span className="text-[10px] uppercase tracking-wide bg-brand-100 text-brand-700 px-2 py-0.5 rounded">
                                  Occasion: {msg.outfitPlan.intent.occasion}
                                </span>
                              )}
                              {msg.outfitPlan.intent?.gender && (
                                <span className="text-[10px] uppercase tracking-wide bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  Gender: {msg.outfitPlan.intent.gender}
                                </span>
                              )}
                              {msg.outfitPlan.intent?.styleDescriptors?.map((style) => (
                                <span
                                  key={`style-${style}`}
                                  className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                                >
                                  {style}
                                </span>
                              ))}
                              {msg.outfitPlan.intent?.priorityColors?.map((color) => (
                                <span
                                  key={`color-${color}`}
                                  className="text-[10px] uppercase tracking-wide bg-sky-100 text-sky-700 px-2 py-0.5 rounded"
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {msg.outfitPlan.recommendedProducts.map((product) => (
                              <Link
                                key={product.id}
                                to={product.link}
                                className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors p-2 rounded border"
                              >
                                <img
                                  src={product.image || '/placeholder.svg'}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                    <span className="text-[10px] uppercase tracking-wide text-gray-500">{product.label}</span>
                                  </div>
                                  {product.brand && (
                                    <p className="text-xs text-gray-500">{product.brand}</p>
                                  )}
                                  <p className="text-xs font-semibold text-green-600">
                                    ₹{(product.discountPrice ?? product.price).toLocaleString('en-IN')}
                                  </p>
                                  {product.matchReasons && product.matchReasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {product.matchReasons.map((reason) => (
                                        <span
                                          key={`${product.id}-${reason}`}
                                          className="text-[10px] uppercase tracking-wide bg-brand-100 text-brand-700 px-2 py-0.5 rounded"
                                        >
                                          #{reason}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>

                        {msg.outfitPlan.costBreakdown && (
                          <div className="bg-white p-2 rounded border space-y-2">
                            <p className="text-sm font-medium text-gray-900">Cost Breakdown</p>
                            <div className="space-y-1">
                              {msg.outfitPlan.costBreakdown.items.map((item) => (
                                <Link
                                  key={`${item.slot}-${item.name}`}
                                  to={item.link}
                                  className="flex items-center justify-between gap-2 text-xs text-gray-600 hover:text-gray-800"
                                >
                                  <span className="truncate pr-2">{item.label}: {item.name}</span>
                                  <span className="font-semibold text-gray-900">{item.formattedFinalPrice}</span>
                                </Link>
                              ))}
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold text-brand-700">
                              <span>Total outfit cost</span>
                              <span>{msg.outfitPlan.costBreakdown.formattedTotal}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <span className="text-xs block mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg p-3 bg-gray-200 text-gray-800 rounded-bl-none flex items-center gap-2">
                    <Spin size="small" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t flex items-center gap-2">
            {isListening && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Listening...</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceInput}
              className={`h-8 w-8 transition-colors duration-200 ${
                isListening
                  ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title={isListening ? 'Stop voice input (Ctrl+M)' : 'Start voice input (Ctrl+M)'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={triggerImageUpload}
              className="h-8 w-8"
            >
              <Camera size={18} />
            </Button>
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim() && !uploadedImage}>
              <Send size={16} />
            </Button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleImageUpload}
            />
          </div>
        </Card>
      )}
    </>
  );
};

export default AIAssistant;
