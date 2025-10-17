const express = require('express');
const router = express.Router();
const styleSuggestionsController = require('../controllers/styleSuggestionsController');
const auth = require('../middleware/auth');

// Get real-time style suggestions for a specific product (no auth required)
router.get('/product/:productId', styleSuggestionsController.getProductStyleSuggestion);

// Get style suggestions (returns cached data)
router.get('/', auth, styleSuggestionsController.getStyleSuggestions);

// Force refresh suggestions
router.post('/refresh', auth, styleSuggestionsController.refreshStyleSuggestions);

module.exports = router;
