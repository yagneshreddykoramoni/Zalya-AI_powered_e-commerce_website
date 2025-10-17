const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    zip: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const paymentMethodSchema = new mongoose.Schema({
    cardholderName: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },
    last4: {
        type: String,
        required: true,
        match: [/^\d{4}$/]
    },
    expiryMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    expiryYear: {
        type: Number,
        required: true,
        min: 2000
    },
    cardHash: {
        type: String,
        required: true,
        select: false
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    }
}, { _id: true });

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
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
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    profilePicture: {
        data: Buffer,
        contentType: String
    },
    registrationDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    preferences: {
        favoriteCategories: [{
            type: String
        }],
        sizes: [{
            type: String
        }]
    },
    budgetPlan: {
        totalBudget: {
            type: Number,
            default: 0
        },
        allocations: {
            clothing: {
                type: Number,
                default: 0
            },
            accessories: {
                type: Number,
                default: 0
            },
            footwear: {
                type: Number,
                default: 0
            },
            other: {
                type: Number,
                default: 0
            }
        },
        spending: {
            clothing: {
                type: Number,
                default: 0
            },
            accessories: {
                type: Number,
                default: 0
            },
            footwear: {
                type: Number,
                default: 0
            },
            other: {
                type: Number,
                default: 0
            }
        }
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    cart: {
        items: [{
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                default: 1
            },
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            }
        }],
        total: {
            type: Number,
            default: 0
        }
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    styleSuggestions: {
        gender: {
            type: String,
            enum: ['men', 'women', 'unisex'],
            default: 'men'
        },
        outfits: [{
            top: {
                type: mongoose.Schema.Types.Mixed
            },
            bottom: {
                type: mongoose.Schema.Types.Mixed
            },
            accessory: {
                type: mongoose.Schema.Types.Mixed
            }
        }],
        lastUpdated: {
            type: Date
        }
    },
    savedAddresses: {
        type: [addressSchema],
        default: []
    },
    savedPaymentMethods: {
        type: [paymentMethodSchema],
        default: []
    }
}, { timestamps: true });

// Add pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (this.isModified('role') && this.role !== 'user') {
        this.role = 'user';
    }

    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.pre('findOneAndUpdate', function (next) {
    if (this._update && Object.prototype.hasOwnProperty.call(this._update, 'role') && this._update.role !== 'user') {
        this._update.role = 'user';
    }
    next();
});

// Add method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Add methods to handle profile updates
userSchema.methods.updateProfile = async function (updates) {
    Object.keys(updates).forEach(key => {
        if (this[key] !== undefined && key !== 'password' && key !== 'email') {
            this[key] = updates[key];
        }
    });
    return await this.save();
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
