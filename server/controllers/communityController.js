const CommunityPost = require('../models/Community');
const User = require('../models/User');
const Product = require('../models/Product');
const { getSocket } = require('../utils/socket');

const buildProfilePictureDataUrl = (profilePicture) => {
    if (!profilePicture || !profilePicture.data) {
        return '';
    }

    const mimeType = profilePicture.contentType || 'image/jpeg';
    const rawData = profilePicture.data;

    try {
        if (Buffer.isBuffer(rawData)) {
            return `data:${mimeType};base64,${rawData.toString('base64')}`;
        }

        if (typeof rawData === 'string') {
            if (rawData.startsWith('data:')) {
                return rawData;
            }
            return `data:${mimeType};base64,${rawData}`;
        }

        if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
            return `data:${mimeType};base64,${Buffer.from(rawData.data).toString('base64')}`;
        }
    } catch (error) {
        console.warn('Failed to convert profile picture to data URL', error);
    }

    return '';
};

const resolveUserId = (userReference) => {
    if (!userReference) {
        return null;
    }

    if (typeof userReference === 'string') {
        return userReference;
    }

    if (typeof userReference === 'object') {
        if (userReference._id) {
            return userReference._id.toString();
        }

        if (userReference.id) {
            return userReference.id.toString();
        }

        if (typeof userReference.toString === 'function') {
            return userReference.toString();
        }
    }

    return null;
};

const transformPost = (postDocument) => {
    if (!postDocument) {
        return null;
    }

    const plainPost = postDocument.toObject ? postDocument.toObject() : postDocument;
    const populatedUser = plainPost.userId && typeof plainPost.userId === 'object' ? plainPost.userId : null;
    const userId = resolveUserId(populatedUser) || resolveUserId(plainPost.userId);
    const userName = populatedUser?.name || plainPost.userName || 'Anonymous';
    const userImage = buildProfilePictureDataUrl(populatedUser?.profilePicture) || plainPost.userImage || '';

    const comments = Array.isArray(plainPost.comments)
        ? plainPost.comments.map((comment) => ({
            ...comment,
            userImage: comment.userImage || '',
        }))
        : [];

    return {
        ...plainPost,
        userId: userId || plainPost.userId,
        userName,
        userImage,
        comments,
    };
};

// Create a new post
const createPost = async (req, res) => {
    try {
        const { content, image, taggedProducts } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const post = new CommunityPost({
            userId: req.user.userId,
            content,
            image,
            taggedProducts
        });
        await post.save();

        const populatedPost = await CommunityPost.findById(post._id)
            .populate('userId', 'name profilePicture')
            .populate('taggedProducts', 'name images price discountPrice');

        const transformedPost = transformPost(populatedPost);

        getSocket().emit('newPost', transformedPost);
        res.status(201).json(transformedPost);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all posts
const getPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name profilePicture')
            .populate('taggedProducts', 'name images price discountPrice');

        const transformedPosts = posts
            .map(transformPost)
            .filter((post) => post !== null);

        res.json(transformedPosts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Like/unlike a post
const likePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const userId = req.user.userId || req.user.id;
        const likeIndex = post.likes.indexOf(userId);

        if (likeIndex === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();

        const populatedPost = await CommunityPost.findById(post._id)
            .populate('userId', 'name profilePicture')
            .populate('taggedProducts', 'name images price discountPrice');

        const transformedPost = transformPost(populatedPost);

        getSocket().emit('postLiked', transformedPost);
        res.json(transformedPost);
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add a comment
const addComment = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const commenter = await User.findById(req.user.userId);
        if (!commenter) return res.status(404).json({ error: 'User not found' });

        const newComment = {
            userId: commenter._id,
            userName: commenter.name,
            userImage: buildProfilePictureDataUrl(commenter.profilePicture),
            content: req.body.content,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        const updatedPost = await post.save();

        const populatedPost = await CommunityPost.findById(updatedPost._id)
            .populate('userId', 'name profilePicture')
            .populate('taggedProducts');

        const response = transformPost(populatedPost);

        getSocket().emit('postCommented', response);
        res.json(response);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Share a post
const sharePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // You can implement actual sharing logic here
        // For now, just return success
        res.json({ message: 'Post shared successfully' });
    } catch (error) {
        console.error('Share post error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Toggle save post
const toggleSavePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id)
            .populate('userId', 'name avatar')
            .populate('taggedProducts');

        if (!post) return res.status(404).json({ error: 'Post not found' });

        const userId = req.user.userId || req.user.id;
        const saveIndex = post.savedBy.indexOf(userId);

        if (saveIndex === -1) {
            // Save the post
            post.savedBy.push(userId);
        } else {
            // Unsave the post
            post.savedBy.splice(saveIndex, 1);
        }

        await post.save();

        const response = transformPost(post);

        getSocket().emit('postSaveToggled', response);
        res.json(response);
    } catch (error) {
        console.error('Toggle save post error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete a post - FIXED VERSION
const deletePost = async (req, res) => {
    try {
        console.log('Delete request for post:', req.params.id);
        console.log('User ID from token:', req.user.userId);

        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            console.log('Post not found');
            return res.status(404).json({ error: 'Post not found' });
        }

        console.log('Post found, userId:', post.userId);
        console.log('Post userId type:', typeof post.userId);
        console.log('Request user ID type:', typeof req.user.userId);

        // Convert both to strings for comparison
        const postUserId = post.userId.toString();
        const requestUserId = req.user.userId.toString();

        console.log('Comparing:', postUserId, 'vs', requestUserId);

        // Verify the requesting user is the post creator
        if (postUserId !== requestUserId) {
            console.log('Authorization failed');
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Use findByIdAndDelete instead of post.remove()
        await CommunityPost.findByIdAndDelete(req.params.id);

        console.log('Post deleted successfully');

        // Emit socket event
        getSocket().emit('postDeleted', req.params.id);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add these new controller methods

// Get users to follow
const getUsersToFollow = async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        const users = await User.find({
            _id: { $ne: currentUserId }
        }).select('name profilePicture followers');

        const followingIds = currentUser.following.map((id) => id.toString());

        res.json(users.map(user => ({
            _id: user._id,
            name: user.name,
            avatar: buildProfilePictureDataUrl(user.profilePicture),
            isFollowing: followingIds.includes(user._id.toString())
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Toggle follow user
const toggleFollowUser = async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const targetUserId = req.params.userId;

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isFollowing = currentUser.following.includes(targetUserId);

        if (isFollowing) {
            // Unfollow - remove from both arrays
            await User.updateOne(
                { _id: currentUserId },
                { $pull: { following: targetUserId } }
            );
            await User.updateOne(
                { _id: targetUserId },
                { $pull: { followers: currentUserId } }
            );
        } else {
            // Follow - add to both arrays
            await User.updateOne(
                { _id: currentUserId },
                { $addToSet: { following: targetUserId } }
            );
            await User.updateOne(
                { _id: targetUserId },
                { $addToSet: { followers: currentUserId } }
            );
        }

        // Emit socket event for real-time updates
        getSocket().emit('followUpdated', {
            userId: targetUserId,
            followerId: currentUserId,
            isFollowing: !isFollowing
        });

        res.json({ success: true, isFollowing: !isFollowing });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get following posts
const getFollowingPosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.userId);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        console.log('Current user ID:', req.user.userId);
        console.log('Current user following list:', currentUser.following);
        console.log('Following list length:', currentUser.following.length);

        // Convert following array to strings for comparison
        const followingIds = currentUser.following.map(id => id.toString());
        console.log('Following IDs as strings:', followingIds);

        const posts = await CommunityPost.find({
            userId: { $in: followingIds }
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'name profilePicture')
            .populate('taggedProducts', 'name images price discountPrice');

        console.log('Found posts from followed users:', posts.length);

        const transformedPosts = posts
            .map(transformPost)
            .filter((post) => post !== null);

        console.log('Returning transformed posts:', transformedPosts.length);
        res.json(transformedPosts);
    } catch (error) {
        console.error('Error in getFollowingPosts:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createPost,
    getPosts,
    likePost,
    addComment,
    sharePost,
    toggleSavePost,
    deletePost,
    getUsersToFollow,
    toggleFollowUser,
    getFollowingPosts
};