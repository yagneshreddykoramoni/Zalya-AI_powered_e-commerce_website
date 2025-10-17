const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
    getAnalytics,
    getSalesMetrics,
    getUserMetrics,
    getSalesByCategory,
    getSalesTrend,
    getUserActivity,
    getOrderStatus,
    getRecommendationMetrics
} = require('../controllers/analyticsController');

// Apply auth and admin middleware to all routes
router.use(auth, admin);

// Analytics routes
router.get('/', getAnalytics);
router.get('/sales', getSalesMetrics);
router.get('/users', getUserMetrics);
router.get('/sales-by-category', getSalesByCategory);
router.get('/sales-trend', getSalesTrend);
router.get('/user-activity', getUserActivity);
router.get('/order-status', getOrderStatus);
router.get('/recommendations', getRecommendationMetrics);

module.exports = router;