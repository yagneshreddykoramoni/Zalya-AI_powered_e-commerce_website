
import { Product, User } from './types';
import { mockProducts } from './mockData';

// Content-based filtering - recommends items similar to what the user likes
export const getContentBasedRecommendations = (
  user: User | null,
  currentProductId?: string
): Product[] => {
  if (!user && !currentProductId) {
    // No user or product context, return popular products
    return mockProducts.sort((a, b) => b.rating - a.rating).slice(0, 4);
  }
  
  // If looking at a specific product, find items in same category and brand
  if (currentProductId) {
    const currentProduct = mockProducts.find(p => p.id === currentProductId);
    if (!currentProduct) return mockProducts.slice(0, 4);
    
    const similarProducts = mockProducts.filter(p => 
      (p.category === currentProduct.category || 
       p.brand === currentProduct.brand) && 
      p.id !== currentProductId
    );
    
    return similarProducts.slice(0, 4);
  }
  
  // For logged-in users without current product context
  if (user?.preferences?.categories?.length) {
    // Filter by user's preferred categories
    const preferredCategoryProducts = mockProducts.filter(p => 
      user.preferences.categories.includes(p.category)
    );
    
    if (preferredCategoryProducts.length >= 4) {
      return preferredCategoryProducts.slice(0, 4);
    }
  }
  
  // Fallback to popular products
  return mockProducts.sort((a, b) => b.rating - a.rating).slice(0, 4);
};

// Collaborative filtering - recommends items that users with similar tastes liked
export const getCollaborativeRecommendations = (user: User | null): Product[] => {
  if (!user) {
    // For anonymous users, return trending products
    return mockProducts.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);
  }
  
  // For real collaborative filtering, we would need purchase/view history of many users
  // This is a simplified version that looks at order history
  
  // Get user purchased product categories
  const purchasedCategories = new Set<string>();
  user.orders?.forEach(order => {
    order.items.forEach(item => {
      purchasedCategories.add(item.product.category);
    });
  });
  
  if (purchasedCategories.size > 0) {
    // Find products in categories that user has purchased before
    // In real collaborative filtering, this would be based on similar users
    const recommendedProducts = mockProducts.filter(
      p => purchasedCategories.has(p.category) && 
      // Don't recommend products the user has already purchased
      !user.orders?.some(order => 
        order.items.some(item => item.product.id === p.id)
      )
    );
    
    return recommendedProducts.sort(() => 0.5 - Math.random()).slice(0, 4);
  }
  
  // Fallback to popular products
  return mockProducts.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);
};

// Hybrid recommendations combining both methods
export const getHybridRecommendations = (
  user: User | null, 
  currentProductId?: string
): Product[] => {
  // Get recommendations from both methods
  const contentBased = getContentBasedRecommendations(user, currentProductId);
  const collaborative = getCollaborativeRecommendations(user);
  
  // Combine and deduplicate
  const combinedIds = new Set<string>();
  const hybridRecommendations: Product[] = [];
  
  // Alternate between methods
  for (let i = 0; i < Math.max(contentBased.length, collaborative.length); i++) {
    if (i < contentBased.length && !combinedIds.has(contentBased[i].id)) {
      combinedIds.add(contentBased[i].id);
      hybridRecommendations.push(contentBased[i]);
    }
    
    if (i < collaborative.length && !combinedIds.has(collaborative[i].id)) {
      combinedIds.add(collaborative[i].id);
      hybridRecommendations.push(collaborative[i]);
    }
  }
  
  return hybridRecommendations.slice(0, 4);
};
