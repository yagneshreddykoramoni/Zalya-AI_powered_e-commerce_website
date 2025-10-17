const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  contactInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit-card', 'paypal', 'upi-app', 'cod', 'bank-transfer'],
    default: 'credit-card'
  },
  paymentDisplayName: { type: String },
  paymentDetails: {
    type: {
      type: String,
      enum: ['credit-card', 'paypal', 'upi-app', 'cod', 'bank-transfer']
    },
    savedPaymentMethodId: {
      type: mongoose.Schema.Types.ObjectId
    },
    card: {
      last4: { type: String },
      brand: { type: String },
      cardholderName: { type: String },
      expiryMonth: { type: Number, min: 1, max: 12 },
      expiryYear: { type: Number, min: 2000 }
    },
    upi: {
      appName: { type: String },
      vpa: { type: String },
      transactionReference: { type: String },
      status: {
        type: String,
        enum: ['pending', 'initiated', 'paid', 'failed'],
        default: 'pending'
      },
      intentUrl: { type: String },
      paidAt: { type: Date }
    },
    wallet: {
      provider: { type: String },
      accountEmail: { type: String }
    },
    notes: { type: String }
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);