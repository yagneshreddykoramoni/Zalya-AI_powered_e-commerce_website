const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const optionalAuth = require('../middleware/optionalAuth');
const upload = require('../middleware/upload'); // Import the upload middleware

// AI Chat routes
router.get('/test', aiChatController.testConnection); // Test route
router.post('/chat', optionalAuth, aiChatController.chatWithAI);

// Use upload.single('image') to handle the file upload
router.post('/fashion', optionalAuth, upload.single('image'), aiChatController.fashionRecognition);

router.get('/outfit-suggestions/:productId', aiChatController.getOutfitSuggestions);

module.exports = router;
