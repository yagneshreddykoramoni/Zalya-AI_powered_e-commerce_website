const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const { triggerRecommendationMetricsUpdate } = require('../services/recommendationMetrics');
const Activity = require('../models/Activity');
const Product = require('../models/Product');

// =============================================
// Configuration
// =============================================

// Configure file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// =============================================
// Validation Helpers
// =============================================

const emailValidation = body('email').isEmail().withMessage('Valid email required');
const passwordValidation = body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters');

const validationErrorResponse = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
};

const recordActivity = async (activityPayload) => {
  try {
    await Activity.create(activityPayload);
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

let legacyAdminMigrationPromise = null;

const migrateLegacyAdminAccounts = async () => {
  const legacyAdmins = await User.find({ role: 'admin' }).lean();
  if (!legacyAdmins.length) return;

  const deletionIds = [];

  for (const legacy of legacyAdmins) {
    if (!legacy.email) continue;

    const normalizedEmail = legacy.email.toLowerCase();
    const registrationDate = legacy.registrationDate || legacy.createdAt || new Date();

    const existingAdmin = await Admin.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      let needsSave = false;

      if (legacy.name && legacy.name !== existingAdmin.name) {
        existingAdmin.name = legacy.name;
        needsSave = true;
      }

      if (legacy.password && legacy.password !== existingAdmin.password) {
        existingAdmin.password = legacy.password;
        needsSave = true;
      }

      if (!existingAdmin.registrationDate && registrationDate) {
        existingAdmin.registrationDate = registrationDate;
        needsSave = true;
      }

      if (needsSave) {
        await existingAdmin.save();
      }
    } else {
      const adminDoc = new Admin({
        name: legacy.name || '',
        email: normalizedEmail,
        password: legacy.password,
        registrationDate
      });

      await adminDoc.save();
    }

    deletionIds.push(legacy._id);
  }

  if (deletionIds.length) {
    await User.deleteMany({ _id: { $in: deletionIds } });
  }
};

const ensureLegacyAdminsMigrated = () => {
  if (!legacyAdminMigrationPromise) {
    legacyAdminMigrationPromise = migrateLegacyAdminAccounts().catch(error => {
      console.error('Legacy admin migration failed:', error);
      legacyAdminMigrationPromise = null;
    });
  }

  return legacyAdminMigrationPromise;
};

// Kick off migration when the module loads to clean up legacy records eagerly
ensureLegacyAdminsMigrated();

// =============================================
// Utility Functions
// =============================================

const TOKEN_EXPIRY = '2h';

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

// Enhanced cart utility functions
const ensureProperCartStructure = (user) => {
  // If cart is missing, initialize it
  if (!user.cart) {
    user.cart = {
      items: [],
      total: 0
    };
    return user;
  }

  // If cart is an array, reset it to proper structure
  if (Array.isArray(user.cart)) {
    user.cart = {
      items: [],
      total: 0
    };
    return user;
  }
  // Ensure cart has items array
  if (!user.cart.items) {
    user.cart.items = [];
  }

  // Ensure cart has total property
  if (typeof user.cart.total !== 'number') {
    user.cart.total = 0;
  }

  // Ensure all items have valid structure
  if (Array.isArray(user.cart.items)) {
    user.cart.items = user.cart.items.filter(item =>
      item && // Filter out null/undefined items
      typeof item === 'object' && // Must be an object
      (item.product !== undefined) && // Must have product property
      typeof item.quantity === 'number' || typeof item.quantity === 'undefined' // Must have valid quantity or be undefined
    );

    // Ensure quantity is a number for all items
    user.cart.items.forEach(item => {
      if (typeof item.quantity !== 'number') {
        item.quantity = 1; // Default to 1 if quantity is not a number
      }
    });
  }

  return user;
};

// Utility function to recalculate cart total
const recalculateCartTotal = async (user) => {
  // Make sure cart is properly structured
  ensureProperCartStructure(user);

  // Make sure product data is populated
  if (user.cart.items.length > 0 && !user.cart.items[0]?.product?.price) {
    await user.populate('cart.items.product');
  }

  // Calculate total safely
  user.cart.total = user.cart.items.reduce((total, item) => {
    if (!item || !item.product) return total;
    const price = Number(item.product.discountPrice) || Number(item.product.price) || 0;
    const quantity = Number(item.quantity) || 1;
    return total + (price * quantity);
  }, 0);

  return user;
};

const detectCardBrand = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^35(2[89]|[3-8][0-9])/.test(digits)) return 'JCB';
  if (/^3(?:0[0-5]|[68])/.test(digits)) return 'Diners Club';
  return 'Card';
};

const sanitizePaymentMethod = (method) => ({
  id: method._id?.toString(),
  cardholderName: method.cardholderName,
  brand: method.brand,
  last4: method.last4,
  expiryMonth: method.expiryMonth,
  expiryYear: method.expiryYear,
  isDefault: method.isDefault
});

// =============================================
// Regular User Routes
// =============================================

// Register new user
router.post('/register', [
  body('name').notEmpty().withMessage('Name required'),
  emailValidation,
  passwordValidation
], async (req, res) => {
  validationErrorResponse(req, res);

  const { name, email, password } = req.body;

  try {
    // Convert email to lowercase for consistency
    const normalizedEmail = email.toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Remove direct password hashing here since it will be handled by the pre-save middleware
    const user = new User({
      name,
      email: normalizedEmail,
      password, // Raw password - will be hashed by pre-save middleware
      role: 'user',
      registrationDate: new Date(),
      preferences: {
        favoriteCategories: [],
        sizes: []
      },
      budgetPlan: {
        totalBudget: 0,
        allocations: {
          clothing: 0,
          accessories: 0,
          footwear: 0,
          other: 0
        },
        spending: {
          clothing: 0,
          accessories: 0,
          footwear: 0,
          other: 0
        }
      },
      cart: {
        items: [],
        total: 0
      },
      following: [],  // Add this
      followers: [],   // Add this
      savedAddresses: [],
      savedPaymentMethods: []
    });

    await user.save();

    await recordActivity({
      type: 'user_registration',
      message: `${user.name} registered an account`,
      user: user._id,
      details: {
        email: user.email
      }
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        registrationDate: user.registrationDate,
        preferences: user.preferences,
        budgetPlan: user.budgetPlan,
        following: [],  // Add this
        followers: [],   // Add this
        savedAddresses: [],
        savedPaymentMethods: []
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// User login
router.post('/login', [emailValidation, body('password').exists()], async (req, res) => {
  validationErrorResponse(req, res);

  const { email, password } = req.body;

  try {
    await ensureLegacyAdminsMigrated();

    // Convert email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail, role: 'user' })
      .populate('following', 'name avatar')  // Add this
      .populate('followers', 'name avatar'); // Add this

    // Add debug logging
    console.log('Login attempt:', { email: normalizedEmail, userFound: !!user });

    if (!user) {
      const adminAccount = await Admin.exists({ email: normalizedEmail });
      if (adminAccount) {
        return res.status(403).json({
          success: false,
          message: 'Admin credentials must be used through the admin login portal.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Ensure proper cart structure before returning user data
    ensureProperCartStructure(user);
    await user.save();

    const token = generateToken(user._id, user.role || 'user');

    await recordActivity({
      type: 'login',
      message: `${user.name} logged in`,
      user: user._id,
      details: {
        email: user.email,
        role: user.role || 'user'
      }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        registrationDate: user.registrationDate,
        profilePicture: user.profilePicture && user.profilePicture.data
          ? `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}`
          : null,
        preferences: user.preferences || {
          favoriteCategories: [],
          sizes: []
        },
        budgetPlan: user.budgetPlan || {
          totalBudget: 0,
          allocations: {
            clothing: 0,
            accessories: 0,
            footwear: 0,
            other: 0
          }
        },
        wishlist: user.wishlist || [],
        cart: user.cart,
        following: user.following || [],  // Add this
        followers: user.followers || [],   // Add this
        savedAddresses: user.savedAddresses || [],
        savedPaymentMethods: (user.savedPaymentMethods || []).map(sanitizePaymentMethod)
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// =============================================
// Admin Routes
// =============================================
// Admin login
router.post('/admin/login', [emailValidation, body('password').exists()], async (req, res) => {
  validationErrorResponse(req, res);
  const { email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();

    await ensureLegacyAdminsMigrated();

    // Check for admin user in the Admin collection
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token with admin role
    const token = generateToken(admin._id, 'admin');

    await recordActivity({
      type: 'login',
      message: `${admin.name || normalizedEmail} logged in as admin`,
      details: {
        email: admin.email,
        role: 'admin'
      }
    });

    // Send response
    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name || email.split('@')[0],
        email: admin.email,
        role: 'admin',
        registrationDate: admin.registrationDate ? admin.registrationDate.toISOString() : new Date().toISOString(),
        profilePicture: null,
        preferences: {
          favoriteCategories: [],
          sizes: []
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: error.message
    });
  }
});

// =============================================
// Authenticated User Routes
// =============================================

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')
      .populate('following', 'name avatar')  // Add this
      .populate('followers', 'name avatar');;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure proper cart structure
    ensureProperCartStructure(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture && user.profilePicture.data
          ? `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}`
          : null,
        registrationDate: user.registrationDate,
        preferences: user.preferences,
        budgetPlan: user.budgetPlan,
        wishlist: user.wishlist,
        following: user.following || [],  // Add this
        followers: user.followers || [],   // Add this
        savedAddresses: user.savedAddresses || [],
        savedPaymentMethods: (user.savedPaymentMethods || []).map(sanitizePaymentMethod)
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile fetch failed',
      error: error.message
    });
  }
});

// Update profile
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const updates = req.file
      ? {
        ...req.body,
        profilePicture: {
          data: req.file.buffer,
          contentType: req.file.mimetype
        }
      }
      : req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    // Ensure proper cart structure
    ensureProperCartStructure(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture && user.profilePicture.data
          ? `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}`
          : null,
        registrationDate: user.registrationDate,
        preferences: user.preferences,
        budgetPlan: user.budgetPlan,
        wishlist: user.wishlist,
        following: user.following || [],
        followers: user.followers || [],
        cart: user.cart,
        savedAddresses: user.savedAddresses || [],
        savedPaymentMethods: (user.savedPaymentMethods || []).map(sanitizePaymentMethod)
      }
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Update failed',
      error: error.message
    });
  }
});

// Update profile picture
router.post('/profile/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture provided'
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profilePicture = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    ensureProperCartStructure(user);
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}`,
        registrationDate: user.registrationDate,
        preferences: user.preferences,
        budgetPlan: user.budgetPlan,
        wishlist: user.wishlist,
        following: user.following || [],
        followers: user.followers || [],
        cart: user.cart,
        savedAddresses: user.savedAddresses || [],
        savedPaymentMethods: (user.savedPaymentMethods || []).map(sanitizePaymentMethod)
      }
    });
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile picture update failed',
      error: error.message
    });
  }
});

// Change password
router.put('/change-password', [
  auth,
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  validationErrorResponse(req, res);

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid current password'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message
    });
  }
});

// =============================================
// Saved Address Routes
// =============================================

const addressValidators = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('address').trim().notEmpty().withMessage('Street address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zip').trim().notEmpty().withMessage('ZIP/Postal code is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('savedAddresses');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      addresses: user.savedAddresses || []
    });
  } catch (error) {
    console.error('Fetch addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved addresses',
      error: error.message
    });
  }
});

router.post('/addresses', auth, addressValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country,
      isDefault
    } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const trimmedAddress = address.trim();
    const normalizedCity = city.trim().toLowerCase();
    const normalizedState = state.trim().toLowerCase();
    const normalizedZip = zip.trim();
    const normalizedCountry = country.trim().toLowerCase();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedZip = zip.trim();
    const trimmedCountry = country.trim();

    // Check if identical address already exists
    const existingAddressIndex = user.savedAddresses.findIndex(saved =>
      saved.email === normalizedEmail &&
      saved.address.trim().toLowerCase() === trimmedAddress.toLowerCase() &&
      saved.city.trim().toLowerCase() === normalizedCity &&
      saved.state.trim().toLowerCase() === normalizedState &&
      saved.zip.trim() === normalizedZip &&
      saved.country.trim().toLowerCase() === normalizedCountry
    );

    // Determine if the address should become the default
    const shouldBeDefault = typeof isDefault === 'boolean'
      ? isDefault
      : user.savedAddresses.length === 0;

    if (shouldBeDefault) {
      user.savedAddresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    let savedAddress;

    if (existingAddressIndex !== -1) {
      const addressDoc = user.savedAddresses[existingAddressIndex];
      addressDoc.firstName = firstName;
      addressDoc.lastName = lastName;
      addressDoc.email = normalizedEmail;
      addressDoc.phone = phone;
      addressDoc.address = trimmedAddress;
      addressDoc.city = trimmedCity;
      addressDoc.state = trimmedState;
      addressDoc.zip = trimmedZip;
      addressDoc.country = trimmedCountry;
      addressDoc.isDefault = shouldBeDefault;

      savedAddress = addressDoc;
    } else {
      savedAddress = user.savedAddresses.create({
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        address: trimmedAddress,
        city: trimmedCity,
        state: trimmedState,
        zip: trimmedZip,
        country: trimmedCountry,
        isDefault: shouldBeDefault
      });
      user.savedAddresses.push(savedAddress);
    }

    await user.save();

    res.status(existingAddressIndex === -1 ? 201 : 200).json({
      success: true,
      address: savedAddress,
      addresses: user.savedAddresses,
      message: existingAddressIndex === -1
        ? 'Address saved successfully'
        : 'Address updated successfully'
    });
  } catch (error) {
    console.error('Save address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save address',
      error: error.message
    });
  }
});

// =============================================
// Saved Payment Method Routes
// =============================================

const paymentMethodValidators = [
  body('cardholderName').trim().notEmpty().withMessage('Cardholder name is required'),
  body('cardNumber').trim().matches(/^[\d\s-]{12,23}$/).withMessage('Card number must be 12-19 digits'),
  body('expiryMonth').isInt({ min: 1, max: 12 }).withMessage('Expiry month must be between 1 and 12'),
  body('expiryYear').isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 25 }).withMessage('Expiry year is invalid'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

router.get('/payment-methods', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('savedPaymentMethods');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      paymentMethods: (user.savedPaymentMethods || []).map(sanitizePaymentMethod)
    });
  } catch (error) {
    console.error('Fetch payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved payment methods',
      error: error.message
    });
  }
});

router.post('/payment-methods', auth, paymentMethodValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      cardholderName,
      cardNumber,
      expiryMonth,
      expiryYear,
      isDefault
    } = req.body;

    const normalizedNumber = (cardNumber || '').replace(/\D/g, '');

    if (normalizedNumber.length < 12 || normalizedNumber.length > 19) {
      return res.status(400).json({
        success: false,
        message: 'Card number must contain between 12 and 19 digits'
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Card has expired'
      });
    }

    const user = await User.findById(req.user.userId).select('+savedPaymentMethods.cardHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cardHash = crypto.createHash('sha256').update(normalizedNumber).digest('hex');
    const brand = detectCardBrand(normalizedNumber);
    const last4 = normalizedNumber.slice(-4);

    const existingIndex = user.savedPaymentMethods.findIndex(method => method.cardHash === cardHash);

    const shouldBeDefault = typeof isDefault === 'boolean'
      ? isDefault
      : user.savedPaymentMethods.length === 0;

    if (shouldBeDefault) {
      user.savedPaymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    let savedMethod;

    if (existingIndex !== -1) {
      const methodDoc = user.savedPaymentMethods[existingIndex];
      methodDoc.cardholderName = cardholderName;
      methodDoc.brand = brand;
      methodDoc.last4 = last4;
      methodDoc.expiryMonth = expiryMonth;
      methodDoc.expiryYear = expiryYear;
      methodDoc.isDefault = shouldBeDefault;
      savedMethod = methodDoc;
    } else {
      savedMethod = user.savedPaymentMethods.create({
        cardholderName,
        brand,
        last4,
        expiryMonth,
        expiryYear,
        cardHash,
        isDefault: shouldBeDefault
      });

      user.savedPaymentMethods.push(savedMethod);
    }

    await user.save();

    const sanitizedMethods = user.savedPaymentMethods.map(sanitizePaymentMethod);

    res.status(existingIndex === -1 ? 201 : 200).json({
      success: true,
      paymentMethod: sanitizePaymentMethod(savedMethod),
      paymentMethods: sanitizedMethods,
      message: existingIndex === -1
        ? 'Payment method saved successfully'
        : 'Payment method updated successfully'
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment method',
      error: error.message
    });
  }
});

// =============================================
// Budget Routes
// =============================================

// GET user budget data
router.get('/get-budget/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user can only access their own budget
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure spending field exists
    if (!user.budgetPlan.spending) {
      user.budgetPlan.spending = {
        clothing: 0,
        accessories: 0,
        footwear: 0,
        other: 0
      };
      await user.save();
    }

    res.json({
      success: true,
      budgetPlan: user.budgetPlan
    });
  } catch (error) {
    console.error('Error fetching budget data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget data'
    });
  }
});

// PUT update user budget
router.put('/update-budget', auth, async (req, res) => {
  try {
    const { userId, budgetPlan } = req.body;

    // Ensure user can only update their own budget
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update budget plan
    user.budgetPlan.totalBudget = budgetPlan.totalBudget || 0;

    // Update allocations (planned budget amounts)
    if (budgetPlan.allocations) {
      user.budgetPlan.allocations = {
        clothing: budgetPlan.allocations.clothing || 0,
        accessories: budgetPlan.allocations.accessories || 0,
        footwear: budgetPlan.allocations.footwear || 0,
        other: budgetPlan.allocations.other || 0
      };
    }

    // Preserve existing spending data (don't allow manual updates to spending)
    if (!user.budgetPlan.spending) {
      user.budgetPlan.spending = {
        clothing: 0,
        accessories: 0,
        footwear: 0,
        other: 0
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        budgetPlan: user.budgetPlan
      }
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating budget'
    });
  }
});

router.post('/recalculate-budget/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Reset spending to zero
    user.budgetPlan.spending = {
      clothing: 0,
      accessories: 0,
      footwear: 0,
      other: 0
    };

    // Get all user's orders
    const orders = await Order.find({ user: userId })
      .populate('products.product');

    // Recalculate spending from all orders
    for (const order of orders) {
      await updateUserBudgetSpending(userId, order.products);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recalculating budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// Wishlist Routes
// =============================================

// Add to wishlist
router.post('/wishlist/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId).select('name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { wishlist: productId } },
      { new: true }
    ).populate('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    triggerRecommendationMetricsUpdate();

    await recordActivity({
      type: 'wishlist',
      message: `${user.name} added ${product.name} to their wishlist`,
      user: user._id,
      product: product._id,
      details: {
        action: 'added',
        productName: product.name
      }
    });

    res.json({
      success: true,
      wishlist: user.wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// Remove from wishlist
router.post('/wishlist/remove', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate('wishlist');

    triggerRecommendationMetricsUpdate();

    res.json({
      success: true,
      wishlist: user.wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

// Get wishlist
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('wishlist');
    res.json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist'
    });
  }
});

// =============================================
// Cart Routes
// =============================================

// Add to cart route - Updated version
router.post('/cart/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1, selectedSize, selectedColor } = req.body;

    const product = await Product.findById(productId).select('name price discountPrice');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // 1. Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Ensure proper cart structure
    ensureProperCartStructure(user);

    // 3. Find existing product in cart
    const existingItemIndex = user.cart.items.findIndex(
      item => item.product && item.product.toString() === productId
    );

    // 4. Update or add item
    if (existingItemIndex >= 0) {
      user.cart.items[existingItemIndex].quantity += Number(quantity);
      // Update size and color if provided
      if (selectedSize) user.cart.items[existingItemIndex].selectedSize = selectedSize;
      if (selectedColor) user.cart.items[existingItemIndex].selectedColor = selectedColor;
    } else {
      user.cart.items.push({
        product: productId,
        quantity: Number(quantity),
        selectedSize,
        selectedColor
      });
    }

    // 5. Recalculate total
    await recalculateCartTotal(user);

    // 6. Save changes
    await user.save();

    // 7. Populate product data for response
    await user.populate('cart.items.product');

    triggerRecommendationMetricsUpdate();

    await recordActivity({
      type: 'cart',
      message: `${user.name} added ${product.name} to the cart`,
      user: user._id,
      product: product._id,
      details: {
        quantity: Number(quantity),
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null
      }
    });

    res.json({
      success: true,
      cart: user.cart
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack // Added for debugging
    });
  }
});

// Remove from cart - Updated version
router.post('/cart/remove', auth, async (req, res) => {
  try {
    const { itemId } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure cart structure
    ensureProperCartStructure(user);

    // Remove item from cart (safely handle undefined _id)
    user.cart.items = user.cart.items.filter(item =>
      item && item._id && !item._id.equals(itemId)
    );

    // Recalculate cart total
    await recalculateCartTotal(user);

    // Save changes
    await user.save();

    // Populate product data for response
    await user.populate('cart.items.product');

    triggerRecommendationMetricsUpdate();

    res.json({
      success: true,
      cart: user.cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from cart'
    });
  }
});

// Update cart item quantity
router.post('/cart/update-quantity', auth, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure proper cart structure
    ensureProperCartStructure(user);

    // Find the item in the cart
    const cartItem = user.cart.items.find(item => item && item._id && item._id.equals(itemId));

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Update quantity (ensure it's a number and at least 1)
    cartItem.quantity = Math.max(1, Number(quantity));

    // Recalculate cart total
    await recalculateCartTotal(user);

    // Save changes
    await user.save();

    // Populate product data for response
    await user.populate('cart.items.product');

    triggerRecommendationMetricsUpdate();

    res.json({
      success: true,
      cart: user.cart
    });
  } catch (error) {
    console.error('Update cart quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart quantity'
    });
  }
});

// Get cart - Updated version
router.get('/cart', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'cart.items.product',
        model: 'Product', // ← Explicitly tell Mongoose which model to use
        select: 'name price discountPrice images status' // Fields you NEED
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Filter out ONLY truly broken items (no product ID)
    user.cart.items = user.cart.items.filter(item => item.product?._id);

    await recalculateCartTotal(user);
    await user.save(); // Save changes if any

    res.json({
      success: true,
      cart: user.cart
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear cart
router.post('/cart/clear', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { 'cart.items': [], 'cart.total': 0 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    triggerRecommendationMetricsUpdate();

    res.json({
      success: true,
      cart: user.cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});


module.exports = router;