const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const {
    computeRecommendationMetrics
} = require('../services/recommendationMetrics');

// Get general analytics data
exports.getAnalytics = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        res.json({
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Error fetching analytics data' });
    }
};

// Get sales metrics
exports.getSalesMetrics = async (req, res) => {
    try {
        console.log('Fetching sales metrics...');

        // Verify database connection
        if (!mongoose.connection.readyState) {
            throw new Error('Database connection not established');
        }

        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } }, // Exclude cancelled orders
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        // Calculate average order value
        const averageOrder = totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0;

        console.log('Orders:', totalOrders);
        console.log('Revenue data:', totalRevenue);
        console.log('Average order value:', averageOrder);

        // Send only one response
        res.json({
            success: true,
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            averageOrder: Math.round(averageOrder * 100) / 100 // Round to 2 decimal places
        });
    } catch (error) {
        console.error('Error in getSalesMetrics:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales metrics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get user metrics
exports.getUserMetrics = async (req, res) => {
    try {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Current week new users
        const currentWeekUsers = await User.countDocuments({
            createdAt: { $gte: lastWeek }
        });

        // Previous week new users
        const previousWeekUsers = await User.countDocuments({
            createdAt: {
                $gte: twoWeeksAgo,
                $lt: lastWeek
            }
        });

        // Calculate growth
        const growth = previousWeekUsers === 0 ? 0 : ((currentWeekUsers - previousWeekUsers) / previousWeekUsers) * 100;

        // Get active users (users who have placed orders in last week)
        const activeUsers = await Order.distinct('user', {
            createdAt: { $gte: lastWeek }
        });

        res.json({
            active: activeUsers.length,
            newSignups: currentWeekUsers,
            growth: Math.round(growth * 100) / 100
        });
    } catch (error) {
        console.error('User Metrics Error:', error);
        res.status(500).json({ message: 'Error fetching user metrics' });
    }
};

// Get sales by category
exports.getSalesByCategory = async (req, res) => {
    try {
        const categorySales = await Order.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
                    count: { $sum: "$products.quantity" }
                }
            },
            {
                $project: {
                    category: "$_id",
                    revenue: "$totalSales",
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
        const categorySalesWithColors = categorySales.map((item, index) => ({
            ...item,
            color: colors[index % colors.length]
        }));

        res.json(categorySalesWithColors); // Return array directly, not wrapped in success object
    } catch (error) {
        console.error('Category Sales Error:', error);
        res.status(500).json({ message: 'Error fetching category sales data' });
    }
};

// Get sales trend data for the last 30 days
exports.getSalesTrend = async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const salesTrend = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    sales: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    sales: 1,
                    orders: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);

        // Fill missing dates with 0 values
        const filledData = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const existingData = salesTrend.find(item =>
                item.date.toDateString() === date.toDateString()
            );

            filledData.push({
                date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
                sales: existingData ? existingData.sales : 0,
                orders: existingData ? existingData.orders : 0
            });
        }

        res.json({
            success: true,
            salesTrend: filledData
        });
        // Remove this duplicate response
        // res.json(filledData);
    } catch (error) {
        console.error('Sales Trend Error:', error);
        res.status(500).json({ message: 'Error fetching sales trend data' });
    }
};

// Get user activity data for the last 14 days
exports.getUserActivity = async (req, res) => {
    try {
        const today = new Date();
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Get new signups by day
        const newSignups = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: fourteenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    newSignups: "$count",
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);

        // Get active users by day (users who placed orders)
        const activeUsers = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: fourteenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                        user: "$user"
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day"
                    },
                    activeUsers: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    activeUsers: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);

        // Fill missing dates and combine data
        const filledData = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const signupData = newSignups.find(item =>
                item.date.toDateString() === date.toDateString()
            );
            const activeData = activeUsers.find(item =>
                item.date.toDateString() === date.toDateString()
            );

            const activeUsersCount = activeData ? activeData.activeUsers : 0;
            const newSignupsCount = signupData ? signupData.newSignups : 0;

            filledData.push({
                date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
                activeUsers: activeUsersCount,
                newSignups: newSignupsCount,
                returning: Math.max(0, activeUsersCount - newSignupsCount) // Estimate returning users
            });
        }

        res.json({
            success: true,
            userActivity: filledData
        });
        // Remove this duplicate response
        // res.json(filledData);
    } catch (error) {
        console.error('User Activity Error:', error);
        res.status(500).json({ message: 'Error fetching user activity data' });
    }
};

// Get order status distribution
exports.getOrderStatus = async (req, res) => {
    try {
        const orderStatus = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: "$_id",
                    value: "$count",
                    _id: 0
                }
            }
        ]);

        // Add colors for each status
        const statusColors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'shipped': '#10b981',
            'delivered': '#8b5cf6',
            'cancelled': '#ef4444'
        };

        const orderStatusWithColors = orderStatus.map(item => ({
            ...item,
            color: statusColors[item.name.toLowerCase()] || '#6b7280'
        }));

        res.json({
            success: true,
            orderStatus: orderStatusWithColors
        });
        // Remove this duplicate response
        // res.json(orderStatusWithColors);
    } catch (error) {
        console.error('Order Status Error:', error);
        res.status(500).json({ message: 'Error fetching order status data' });
    }
};

exports.getRecommendationMetrics = async (req, res) => {
    try {
        const metrics = await computeRecommendationMetrics();
        res.json(metrics);
    } catch (error) {
        console.error('Recommendation Metrics Error:', error);
        res.status(500).json({ message: 'Error fetching recommendation metrics' });
    }
};