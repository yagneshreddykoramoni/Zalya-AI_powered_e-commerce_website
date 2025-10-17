const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const admin = require('../middleware/admin');

// Product routes
router.get('/categories/all', productController.getAllCategories);
router.get('/brands/all', productController.getAllBrands);
router.get('/trending', productController.getTrendingProducts); // Add trending endpoint before general products route
router.get('/recommendations/personalized', optionalAuth, productController.getPersonalizedRecommendations); // Add personalized recommendations route with optional auth
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
// Review routes
router.get('/:productId/reviews', productController.getProductReviews);
router.post('/:productId/reviews', auth, productController.addProductReview);
router.put('/:productId/reviews/:reviewId/helpfulness', auth, productController.updateReviewHelpfulness);

// Admin-only route to migrate existing product images
router.post('/migrate-images', auth, admin, productController.migrateProductImages);

module.exports = router;