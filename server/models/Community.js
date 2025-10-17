const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  image: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String }, // Add this
    userImage: { type: String }, // Add this
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  taggedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);