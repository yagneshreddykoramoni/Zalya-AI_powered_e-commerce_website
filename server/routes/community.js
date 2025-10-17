const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const auth = require('../middleware/auth');

// POST /community - Create a new post
router.post('/', auth, communityController.createPost);

// GET /community - Get all posts
router.get('/', communityController.getPosts);

// POST /community/:id/like - Like a post
router.post('/:id/like', auth, communityController.likePost);

// POST /community/:id/comments - Add a comment
router.post('/:id/comments', auth, communityController.addComment);

// POST /community/:id/share - Share a post
router.post('/:id/share', auth, communityController.sharePost);

// POST /community/:id/save - Toggle save post
router.post('/:id/save', auth, communityController.toggleSavePost);

// DELETE /community/:id - Delete a post
router.delete('/:id', auth, communityController.deletePost);

// Add these new routes
router.get('/users', auth, communityController.getUsersToFollow);
router.post('/users/:userId/follow', auth, communityController.toggleFollowUser);
router.get('/following-posts', auth, communityController.getFollowingPosts);

module.exports = router;