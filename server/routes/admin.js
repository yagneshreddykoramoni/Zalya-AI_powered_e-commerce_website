const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const path = require('path');
const { getSocket } = require('../utils/socket');

const formatCurrencyINR = (value) => {
  const numericValue = typeof value === 'number' ? value : Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(numericValue);
};

const recordActivity = async (activityPayload) => {
  try {
    await Activity.create(activityPayload);
  } catch (error) {
    console.error('Error recording activity:', error);
  }
};

// Middleware to verify if the user is an admin
router.use(auth, admin);

// Get admin dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments();
    const pendingOrdersCount = await Order.countDocuments({ status: 'pending' });

    res.json({
      productCount,
      userCount,
      pendingOrdersCount
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('user', 'name email role')
      .populate('product', 'name')
      .populate('order', 'totalAmount paymentDisplayName');

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create activity for user deletion
    await recordActivity({
      type: 'user_update',
      message: `User ${user.name} was deleted`,
      user: req.user.userId,
      details: {
        email: user.email,
        action: 'deleted'
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new product with image upload
router.post('/products', upload.array('productImages', 10), async (req, res) => {
  try {
    // Process the uploaded files
    const uploadedFiles = req.files || [];
    const imageUrls = uploadedFiles.map(file =>
      `/uploads/products/${file.filename}`
    );

    // Process existing images if any
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error('Error parsing existingImages:', e);
      }
    }

    // Combine existing images with new uploads
    const images = [...existingImages, ...imageUrls];

    // Process arrays that were stringified
    let tags = [], sizes = [], colors = [];

    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    if (req.body.sizes) {
      try {
        sizes = JSON.parse(req.body.sizes);
      } catch (e) {
        console.error('Error parsing sizes:', e);
      }
    }

    if (req.body.colors) {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (e) {
        console.error('Error parsing colors:', e);
      }
    }

    // Create product object
    const productData = {
      ...req.body,
      images,
      tags,
      sizes,
      colors
    };

    const product = new Product(productData);
    await product.save();

    // Create activity for product creation
    await recordActivity({
      type: 'product_update',
      message: `New product ${product.name} was added`,
      product: product._id,
      user: req.user.userId,
      details: {
        action: 'created',
        productName: product.name
      }
    });

    // Broadcast real-time notification for all connected users
    try {
      const io = getSocket();
      io.emit('product:new', {
        id: `product:${product._id.toString()}:${Date.now()}`,
        title: 'New Arrival',
        message: `${product.name} just dropped! Check it out now.`,
        type: 'promo',
        productId: product._id.toString(),
        imageUrl: product.images?.[0] || null,
        actionUrl: `/product/${product._id.toString()}`,
        price: product.price,
        discountPrice: product.discountPrice ?? null,
        timestamp: new Date().toISOString()
      });
    } catch (socketError) {
      console.error('Socket emission error (product:new):', socketError);
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a product with image upload
router.put('/products/:id', upload.array('productImages', 10), async (req, res) => {
  try {
    // Process the uploaded files
    const uploadedFiles = req.files || [];
    const newImageUrls = uploadedFiles.map(file =>
      `/uploads/products/${file.filename}`
    );

    // Process existing images if any
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error('Error parsing existingImages:', e);
      }
    }

    // Combine existing images with new uploads
    const images = [...existingImages, ...newImageUrls];

    // Process arrays that were stringified
    let tags = [], sizes = [], colors = [];

    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    if (req.body.sizes) {
      try {
        sizes = JSON.parse(req.body.sizes);
      } catch (e) {
        console.error('Error parsing sizes:', e);
      }
    }

    if (req.body.colors) {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (e) {
        console.error('Error parsing colors:', e);
      }
    }

    // Create updated product data
    const productData = {
      ...req.body,
      images,
      tags,
      sizes,
      colors,
      updatedAt: Date.now()
    };

    // Find the existing product to get its current images
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update the product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );

    // Create activity for product update
    await recordActivity({
      type: 'product_update',
      message: `Product ${product.name} was updated`,
      product: product._id,
      user: req.user.userId,
      details: {
        action: 'updated',
        productName: product.name
      }
    });

    // Determine if price or discount changed and broadcast notification
    try {
      const priceChanged = typeof req.body.price !== 'undefined' && Number(existingProduct.price ?? 0) !== Number(product.price ?? 0);
      const discountChanged = typeof req.body.discountPrice !== 'undefined' && Number(existingProduct.discountPrice ?? 0) !== Number(product.discountPrice ?? 0);

      if (priceChanged || discountChanged) {
        const io = getSocket();
        const notificationType = priceChanged ? 'priceAlert' : 'promo';
        const title = priceChanged
          ? `${product.name} price update`
          : `${product.name} discount update`;
        const effectiveCurrentPrice = Number(product.discountPrice ?? product.price ?? 0);
        const effectivePreviousPrice = Number(existingProduct.discountPrice ?? existingProduct.price ?? product.price ?? 0);
        const basePriceForDiscount = Number(existingProduct.price ?? product.price ?? 0);

        let message;
        if (priceChanged) {
          message = `${product.name} is now available for ${formatCurrencyINR(effectiveCurrentPrice)} (previously ${formatCurrencyINR(effectivePreviousPrice)}).`;
        } else if (product.discountPrice && basePriceForDiscount > 0) {
          const discountPercent = Math.round(((basePriceForDiscount - Number(product.discountPrice)) / basePriceForDiscount) * 100);
          message = `${product.name} now has a ${discountPercent}% discount!`;
        } else if (product.discountPrice) {
          message = `${product.name} now has a special discount available.`;
        } else {
          message = `${product.name} no longer has a discount applied.`;
        }

        io.emit('product:price-update', {
          id: `product:${product._id.toString()}:${Date.now()}`,
          title,
          message,
          type: notificationType,
          productId: product._id.toString(),
          imageUrl: product.images?.[0] || null,
          actionUrl: `/product/${product._id.toString()}`,
          price: product.price,
          discountPrice: product.discountPrice ?? null,
          previousPrice: existingProduct.price ?? null,
          previousDiscountPrice: existingProduct.discountPrice ?? null,
          timestamp: new Date().toISOString()
        });
      }
    } catch (socketError) {
      console.error('Socket emission error (product:price-update):', socketError);
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create activity for product deletion
    await recordActivity({
      type: 'product_update',
      message: `Product ${product.name} was deleted`,
      user: req.user.userId,
      details: {
        action: 'deleted',
        productName: product.name
      }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('products.product', 'name price');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create activity for order status update
    await recordActivity({
      type: 'order',
      message: `Order #${order._id.toString().slice(-6)} status changed to ${status}`,
      order: order._id,
      user: req.user.userId,
      details: {
        newStatus: status
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get orders for a specific user
router.get('/orders/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate('user', 'name email')
      .populate('products.product', 'name price images');

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;