/**
 * Admin middleware
 * Verifies the user has admin role
 * Must be used after auth middleware
 */
module.exports = function(req, res, next) {
  // Simple role check - no database query needed
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  
  next();
};