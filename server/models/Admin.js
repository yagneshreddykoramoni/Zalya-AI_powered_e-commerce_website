const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving when needed
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Skip hashing if the value already appears to be a bcrypt hash
  if (typeof this.password === 'string' && /^\$2[aby]\$\d{2}\$/.test(this.password)) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);