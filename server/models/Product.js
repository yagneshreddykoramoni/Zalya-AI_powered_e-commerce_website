const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userImage: String,
  rating: { type: Number, required: true, min: 0, max: 5 },
  comment: { type: String, required: true },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  subcategory: {
    type: String
  },
  brand: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  images: [{
    type: String
  }],
  colors: [{
    type: String
  }],
  sizes: [{
    type: String
  }], tags: [{
    type: String
  }],
  styleType: {
    type: String
  },
  occasion: [{
    type: String
  }],
  season: [{
    type: String
  }],
  fitType: {
    type: String
  },
  material: {
    type: String
  },
  reviews: [reviewSchema],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Update the updatedAt field on save
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;