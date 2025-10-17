const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'order',
      'purchase',
      'cart',
      'wishlist',
      'login',
      'user_registration',
      'user_update',
      'product_update',
      'review'
    ]
  },
  message: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);