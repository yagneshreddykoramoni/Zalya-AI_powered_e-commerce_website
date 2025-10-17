const jwt = require('jsonwebtoken');

/**
 * Optional Authentication middleware
 * Verifies the JWT token if present and sets req.user, but allows requests without tokens
 */
module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');

    // If no token, continue but with no user context
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Set user info in a consistent format matching how routes access it
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (err) {
        // Invalid token, but still allow the request without user context
        console.error('Optional Token verification error:', err.message);
        req.user = null;
        next();
    }
};