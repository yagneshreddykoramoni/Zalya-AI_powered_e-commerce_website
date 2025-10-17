const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * Verifies the JWT token and sets req.user with standardized user information
 */
module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set user info in a consistent format matching how routes access it
    req.user = {
      userId: decoded.userId,  // Using 'userId' to match route checks
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};