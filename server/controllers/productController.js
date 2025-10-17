const Product = require('../models/Product');
const { processProductImages } = require('../utils/imageHandler');
const User = require('../models/User'); // Add this line at the top
const Order = require('../models/Order');

exports.getProducts = async (req, res) => {
  try {
    const {
      query, category, brands, minPrice, maxPrice,
      minRating, inStock, sort, page = 1, limit = 12
    } = req.query;
    // Build filter object
    const filter = {};

    if (query) {
      // Search across multiple fields: name, description, brand, category, and tags
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (brands && brands.length > 0) {
      filter.brand = { $in: brands.split(',') };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Build sort object
    let sortOption = {};
    switch (sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'latest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { _id: 1 }; // Default sorting by ID
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Product.countDocuments(filter);
    const pages = Math.ceil(total / limitNum);

    res.json({
      products,
      pagination: {
        total,
        pages,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error in getProducts controller:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error in getProductById controller:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error in getAllCategories controller:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand');
    res.json(brands);
  } catch (error) {
    console.error('Error in getAllBrands controller:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New function to migrate existing product images
exports.migrateProductImages = async (req, res) => {
  try {
    const products = await Product.find();
    let migratedCount = 0;

    for (const product of products) {
      // Process images for this product
      const localImagePaths = await processProductImages(product.images);

      // Update product with local image paths
      if (JSON.stringify(localImagePaths) !== JSON.stringify(product.images)) {
        product.images = localImagePaths;
        await product.save();
        migratedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully migrated images for ${migratedCount} products`
    });
  } catch (error) {
    console.error('Error migrating product images:', error);
    res.status(500).json({
      success: false,
      message: 'Error migrating product images',
      error: error.message
    });
  }
};

// Add a review
exports.addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id; // Assuming auth middleware sets req.user

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = {
      userId,
      userName: req.user.name,
      userImage: req.user.avatar,
      rating,
      comment,
      createdAt: new Date()
    };

    product.reviews.push(review);

    // Update product rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating = totalRating / product.reviews.length;
    product.reviewCount = product.reviews.length;

    await product.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review' });
  }
};

// Update review helpfulness
exports.updateReviewHelpfulness = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { isHelpful } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (isHelpful) {
      review.helpfulCount += 1;
    } else {
      review.notHelpfulCount += 1;
    }

    await product.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error updating review helpfulness' });
  }
};

// Add these to your productController.js

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product.reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

// Add a review to a product
exports.addProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId; // Using userId from auth middleware

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the user to get complete user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const review = {
      userId: user._id,
      userName: user.name,
      userImage: user.profilePicture?.data ? 'data:' + user.profilePicture.contentType + ';base64,' + user.profilePicture.data.toString('base64') : null,
      rating,
      comment,
      createdAt: new Date()
    };

    product.reviews.push(review);

    // Update product rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating = totalRating / product.reviews.length;
    product.reviewCount = product.reviews.length;

    await product.save();
    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error); // Add error logging
    res.status(500).json({ message: 'Error adding review' });
  }
};

// Get trending products based on real user data analysis
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const limitNum = parseInt(limit);

    // Get trending products based on:
    // 1. Order frequency (how often they're purchased)
    // 2. Recent ratings and reviews
    // 3. High rating scores
    // 4. Recent activity (orders in last 30 days)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate trending products based on multiple factors
    const trendingProducts = await Order.aggregate([
      // Match orders from last 30 days
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $ne: 'cancelled' }
        }
      },
      // Unwind products array to analyze individual products
      { $unwind: '$products' },
      // Group by product to calculate metrics
      {
        $group: {
          _id: '$products.product',
          totalOrders: { $sum: 1 },
          totalQuantitySold: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
          uniqueCustomers: { $addToSet: '$user' },
          recentActivity: { $max: '$createdAt' }
        }
      },
      // Calculate trending score
      {
        $addFields: {
          customerCount: { $size: '$uniqueCustomers' },
          trendingScore: {
            $add: [
              { $multiply: ['$totalOrders', 10] }, // Order frequency weight
              { $multiply: ['$customerCount', 15] }, // Unique customer weight
              { $multiply: ['$totalQuantitySold', 5] } // Quantity sold weight
            ]
          }
        }
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      // Add product rating and review factors to trending score
      {
        $addFields: {
          finalTrendingScore: {
            $add: [
              '$trendingScore',
              { $multiply: [{ $ifNull: ['$productDetails.rating', 0] }, 20] }, // Rating weight
              { $multiply: [{ $ifNull: ['$productDetails.reviewCount', 0] }, 2] } // Review count weight
            ]
          }
        }
      },
      // Filter products with decent ratings and in stock
      {
        $match: {
          'productDetails.rating': { $gte: 3.5 },
          'productDetails.stock': { $gt: 0 }
        }
      },
      // Sort by trending score
      { $sort: { finalTrendingScore: -1 } },
      // Limit results
      { $limit: limitNum },
      // Project final structure
      {
        $project: {
          _id: '$productDetails._id',
          name: '$productDetails.name',
          description: '$productDetails.description',
          price: '$productDetails.price',
          discountPrice: '$productDetails.discountPrice',
          images: '$productDetails.images',
          category: '$productDetails.category',
          subcategory: '$productDetails.subcategory',
          brand: '$productDetails.brand',
          rating: '$productDetails.rating',
          reviewCount: '$productDetails.reviewCount',
          numReviews: '$productDetails.reviewCount',
          stock: '$productDetails.stock',
          createdAt: '$productDetails.createdAt',
          trendingMetrics: {
            totalOrders: '$totalOrders',
            totalQuantitySold: '$totalQuantitySold',
            customerCount: '$customerCount',
            trendingScore: '$finalTrendingScore'
          }
        }
      }
    ]);

    // If we don't have enough trending products from orders, supplement with highly rated recent products
    if (trendingProducts.length < limitNum) {
      const additionalProducts = await Product.find({
        rating: { $gte: 4.0 },
        stock: { $gt: 0 },
        _id: { $nin: trendingProducts.map(p => p._id) }
      })
        .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
        .limit(limitNum - trendingProducts.length)
        .lean();

      // Add trending metrics for consistency
      const formattedAdditionalProducts = additionalProducts.map(product => ({
        ...product,
        numReviews: product.reviewCount || 0,
        trendingMetrics: {
          totalOrders: 0,
          totalQuantitySold: 0,
          customerCount: 0,
          trendingScore: product.rating * 20 + (product.reviewCount || 0) * 2
        }
      }));

      trendingProducts.push(...formattedAdditionalProducts);
    }

    res.json({
      products: trendingProducts.slice(0, limitNum),
      metadata: {
        totalFound: trendingProducts.length,
        analysisDate: new Date().toISOString(),
        basedOn: 'Order frequency, customer engagement, ratings, and recent activity (last 30 days)'
      }
    });

  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ message: 'Server error fetching trending products' });
  }
};

// Get personalized recommendations for a user
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const { limit = 4, currentProductId, userId: queryUserId } = req.query;
    const limitNum = parseInt(limit);

    // First try to get userId from authenticated user, then from query param
    const userId = req.user?.userId || queryUserId;

    console.log('Getting personalized recommendations:', {
      fromAuth: !!req.user?.userId,
      fromQuery: !!queryUserId,
      finalUserId: userId,
      isAuthenticated: !!req.user
    });

    let recommendedProducts = [];

    if (userId) {
      // Get user with populated data
      const user = await User.findById(userId)
        .populate('wishlist')
        .populate({
          path: 'orders',
          populate: {
            path: 'products.product',
            model: 'Product'
          }
        });

      if (user) {
        // Content-based recommendations
        const contentBasedRecs = await getContentBasedRecommendations(user, currentProductId);

        // Collaborative filtering recommendations
        const collaborativeRecs = await getCollaborativeRecommendations(user);

        // Combine and deduplicate recommendations
        const combinedIds = new Set();

        // Prioritize content-based for current product context
        if (currentProductId) {
          contentBasedRecs.forEach(product => {
            if (!combinedIds.has(product._id.toString()) && recommendedProducts.length < limitNum) {
              combinedIds.add(product._id.toString());
              recommendedProducts.push(product);
            }
          });
        }

        // Add collaborative filtering results
        collaborativeRecs.forEach(product => {
          if (!combinedIds.has(product._id.toString()) && recommendedProducts.length < limitNum) {
            combinedIds.add(product._id.toString());
            recommendedProducts.push(product);
          }
        });

        // If still need more, add content-based (when no current product)
        if (!currentProductId) {
          contentBasedRecs.forEach(product => {
            if (!combinedIds.has(product._id.toString()) && recommendedProducts.length < limitNum) {
              combinedIds.add(product._id.toString());
              recommendedProducts.push(product);
            }
          });
        }
      }
    }

    // If not enough personalized recommendations or user not logged in, fill with trending/popular products
    if (recommendedProducts.length < limitNum) {
      const fallbackProducts = await Product.find({
        rating: { $gte: 4.0 },
        stock: { $gt: 0 },
        _id: { $nin: recommendedProducts.map(p => p._id) }
      })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limitNum - recommendedProducts.length)
        .lean();

      recommendedProducts.push(...fallbackProducts);
    }

    // Format response to match frontend expectations
    const formattedProducts = recommendedProducts.slice(0, limitNum).map(product => ({
      ...product,
      id: product._id,
      numReviews: product.reviewCount || 0
    }));

    res.json({
      products: formattedProducts,
      personalized: !!userId,
      metadata: {
        totalFound: formattedProducts.length,
        isPersonalized: !!userId,
        basedOn: userId
          ? 'User orders, wishlist, preferences, and collaborative filtering'
          : 'Popular and highly-rated products'
      }
    });

  } catch (error) {
    console.error('Error fetching personalized recommendations:', error);
    res.status(500).json({ message: 'Server error fetching recommendations' });
  }
};

// Helper function for content-based recommendations
const getContentBasedRecommendations = async (user, currentProductId) => {
  try {
    let recommendations = [];

    // If viewing a specific product, recommend similar products
    if (currentProductId) {
      const currentProduct = await Product.findById(currentProductId);
      if (currentProduct) {
        // Find products in same category or brand, excluding current product
        recommendations = await Product.find({
          $or: [
            { category: currentProduct.category },
            { brand: currentProduct.brand }
          ],
          _id: { $ne: currentProductId },
          stock: { $gt: 0 },
          rating: { $gte: 3.5 }
        })
          .sort({ rating: -1, reviewCount: -1 })
          .limit(6)
          .lean();
      }
    } else {
      // Recommendations based on user preferences and purchase history
      const userCategories = new Set();
      const userBrands = new Set();

      // Extract categories and brands from user orders
      if (user.orders && user.orders.length > 0) {
        user.orders.forEach(order => {
          if (order.products) {
            order.products.forEach(item => {
              if (item.product) {
                userCategories.add(item.product.category);
                userBrands.add(item.product.brand);
              }
            });
          }
        });
      }

      // Extract categories from wishlist
      if (user.wishlist && user.wishlist.length > 0) {
        user.wishlist.forEach(product => {
          userCategories.add(product.category);
          userBrands.add(product.brand);
        });
      }

      // Use user preferences if available
      if (user.preferences && user.preferences.favoriteCategories) {
        user.preferences.favoriteCategories.forEach(cat => userCategories.add(cat));
      }

      // Build query for personalized recommendations
      const query = {
        stock: { $gt: 0 },
        rating: { $gte: 3.5 }
      };

      if (userCategories.size > 0 || userBrands.size > 0) {
        query.$or = [];
        if (userCategories.size > 0) {
          query.$or.push({ category: { $in: Array.from(userCategories) } });
        }
        if (userBrands.size > 0) {
          query.$or.push({ brand: { $in: Array.from(userBrands) } });
        }
      }

      // Exclude products user already purchased or has in wishlist
      const excludeIds = [];
      if (user.orders) {
        user.orders.forEach(order => {
          if (order.products) {
            order.products.forEach(item => {
              if (item.product && item.product._id) {
                excludeIds.push(item.product._id);
              }
            });
          }
        });
      }
      if (user.wishlist) {
        user.wishlist.forEach(product => {
          if (product._id) {
            excludeIds.push(product._id);
          }
        });
      }

      if (excludeIds.length > 0) {
        query._id = { $nin: excludeIds };
      }

      recommendations = await Product.find(query)
        .sort({ rating: -1, reviewCount: -1 })
        .limit(6)
        .lean();
    }

    return recommendations;
  } catch (error) {
    console.error('Error in content-based recommendations:', error);
    return [];
  }
};

// Helper function for collaborative filtering
const getCollaborativeRecommendations = async (user) => {
  try {
    // Find users with similar purchase patterns
    const userPurchasedCategories = new Set();

    if (user.orders && user.orders.length > 0) {
      user.orders.forEach(order => {
        if (order.products) {
          order.products.forEach(item => {
            if (item.product && item.product.category) {
              userPurchasedCategories.add(item.product.category);
            }
          });
        }
      });
    }

    if (userPurchasedCategories.size === 0) {
      // No purchase history, return popular products
      return await Product.find({
        stock: { $gt: 0 },
        rating: { $gte: 4.0 }
      })
        .sort({ reviewCount: -1, rating: -1 })
        .limit(4)
        .lean();
    }

    // Find products that other users with similar tastes have purchased
    const similarUserOrders = await Order.aggregate([
      // Match orders containing products in categories the user has purchased
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $match: {
          'productDetails.category': { $in: Array.from(userPurchasedCategories) },
          user: { $ne: user._id } // Exclude current user
        }
      },
      // Unwind to work with individual products
      { $unwind: '$products' },
      { $unwind: '$productDetails' },
      // Group by product to count how many similar users bought it
      {
        $group: {
          _id: '$products.product',
          purchaseCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      // Sort by popularity among similar users
      { $sort: { purchaseCount: -1, uniqueUsers: -1 } },
      { $limit: 10 }
    ]);

    // Get full product details for recommended products
    const productIds = similarUserOrders.map(item => item._id);

    // Exclude products user already has
    const excludeIds = [];
    if (user.orders) {
      user.orders.forEach(order => {
        if (order.products) {
          order.products.forEach(item => {
            if (item.product && item.product._id) {
              excludeIds.push(item.product._id);
            }
          });
        }
      });
    }

    const recommendations = await Product.find({
      _id: { $in: productIds, $nin: excludeIds },
      stock: { $gt: 0 },
      rating: { $gte: 3.5 }
    })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(4)
      .lean();

    return recommendations;
  } catch (error) {
    console.error('Error in collaborative filtering:', error);
    return [];
  }
};

// AI-powered smart product search for chatbot
