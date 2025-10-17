const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Register route - remains the same...

// Login route for both users and admins
router.post('/login', async (req, res) => {
    try {
        const { email, password, type } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        let user;
        let isValidPassword = false;

        if (type === 'admin') {
            user = await Admin.findOne({ email: email.toLowerCase() });

            if (!user) {
                return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
            }

            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // Regular user login using User model
            user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            isValidPassword = await user.comparePassword(password);
        }

        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token with role information
        const token = jwt.sign(
            { userId: user._id, role: type },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Prepare user data based on type
        const userData = type === 'admin' ? {
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'admin'
        } : {
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'user',
            profilePicture: user.profilePicture ?
                `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}` :
                null,
            registrationDate: user.registrationDate,
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
            }
        };

        res.json({
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Other routes remain the same...

module.exports = router;
