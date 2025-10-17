const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { generateInvoice } = require('../utils/invoiceGenerator');
const { triggerRecommendationMetricsUpdate } = require('../services/recommendationMetrics');
const Activity = require('../models/Activity');
const recordActivity = async (activityPayload) => {
    try {
        await Activity.create(activityPayload);
    } catch (error) {
        console.error('Activity log error:', error);
    }
};

const DEFAULT_UPI_VPA = process.env.BUSINESS_UPI_ID || process.env.DEFAULT_UPI_VPA || 'zalya@upi';

const detectCardBrand = (cardNumber = '') => {
    const digits = cardNumber.replace(/\D/g, '');
    if (/^4/.test(digits)) return 'Visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^6(?:011|5)/.test(digits)) return 'Discover';
    if (/^35(2[89]|[3-8][0-9])/.test(digits)) return 'JCB';
    if (/^3(?:0[0-5]|[68])/.test(digits)) return 'Diners Club';
    return 'Card';
};

const sanitizeCardNumber = (value = '') => value.replace(/\D/g, '');

const parseExpiryDate = (expiryDate = '') => {
    if (!expiryDate || typeof expiryDate !== 'string') {
        return { month: undefined, year: undefined };
    }

    const [rawMonth, rawYear] = expiryDate.split('/').map(part => part.trim());
    if (!rawMonth || !rawYear) {
        return { month: undefined, year: undefined };
    }

    const month = Number.parseInt(rawMonth, 10);
    let year = Number.parseInt(rawYear, 10);

    if (Number.isNaN(month) || month < 1 || month > 12 || Number.isNaN(year)) {
        return { month: undefined, year: undefined };
    }

    if (year < 100) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year = currentCentury + year;
        if (year < currentYear) {
            year += 100;
        }
    }

    return { month, year };
};

const transformOrderForClient = (orderDoc) => {
    if (!orderDoc) {
        return null;
    }

    const orderObject = orderDoc.toObject ? orderDoc.toObject({ virtuals: true }) : orderDoc;

    const transformProduct = (product) => {
        if (!product) return product;
        if (product.toObject) {
            const productObj = product.toObject();
            return {
                _id: productObj._id,
                name: productObj.name,
                price: productObj.price,
                discountPrice: productObj.discountPrice,
                images: productObj.images || []
            };
        }
        if (product._id) {
            return {
                _id: product._id,
                name: product.name,
                price: product.price,
                discountPrice: product.discountPrice,
                images: product.images || []
            };
        }
        return product;
    };

    const products = (orderObject.products || []).map(item => ({
        ...item,
        product: transformProduct(item.product)
    }));

    const paymentDetails = orderObject.paymentDetails ? { ...orderObject.paymentDetails } : null;

    if (paymentDetails?.savedPaymentMethodId?.toString) {
        paymentDetails.savedPaymentMethodId = paymentDetails.savedPaymentMethodId.toString();
    }

    if (paymentDetails?.upi?.paidAt instanceof Date) {
        paymentDetails.upi.paidAt = paymentDetails.upi.paidAt.toISOString();
    }

    return {
        ...orderObject,
        id: orderObject._id?.toString?.() || orderObject.id,
        products,
        subtotal: orderObject.subtotal,
        taxAmount: orderObject.taxAmount,
        totalAmount: orderObject.totalAmount,
        paymentDetails,
        paymentDisplayName: orderObject.paymentDisplayName || orderObject.paymentMethod
    };
};

const updateUserBudgetSpending = async (userId, orderItems) => {
    try {
        // Group order items by category and sum their totals
        const categoryTotals = {};

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            const category = product.category.toLowerCase();
            const total = item.price * item.quantity;

            // Map product categories to budget categories
            let budgetCategory;
            switch (category) {
                case 't-shirts':
                case 'shirts':
                case 'jeans':
                case 'pants':
                case 'dresses':
                    budgetCategory = 'clothing';
                    break;
                case 'shoes':
                case 'sandals':
                case 'boots':
                    budgetCategory = 'footwear';
                    break;
                case 'jewelry':
                case 'bags':
                case 'belts':
                    budgetCategory = 'accessories';
                    break;
                default:
                    budgetCategory = 'other';
            }

            categoryTotals[budgetCategory] = (categoryTotals[budgetCategory] || 0) + total;
        }

        // Update user's budget spending (NOT allocations)
        const user = await User.findById(userId);

        // Initialize spending field if it doesn't exist
        if (!user.budgetPlan.spending) {
            user.budgetPlan.spending = {
                clothing: 0,
                accessories: 0,
                footwear: 0,
                other: 0
            };
        }

        // Add the new spending to existing spending
        Object.entries(categoryTotals).forEach(([category, amount]) => {
            user.budgetPlan.spending[category] = (user.budgetPlan.spending[category] || 0) + amount;
        });

        await user.save();
        console.log('Updated budget spending for user:', userId, categoryTotals);
    } catch (error) {
        console.error('Error updating budget spending:', error);
    }
};

const createOrder = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            address,
            city,
            state,
            zip,
            country,
            phone,
            paymentMethod,
            savedPaymentMethodId,
            cardNumber,
            cardName,
            expiryDate,
            upiApp,
            upiTransactionId,
            upiVpa,
            upiStatus,
            upiIntentUrl,
            items,
            subtotal,
            tax,
            total
        } = req.body;

        // Ensure user ID is coming from authenticated source
        const userId = req.user?.userId || req.body.user;
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Validate user exists
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            throw new Error('User not found');
        }

        // Validate products
        const validatedProducts = await Promise.all(items.map(async item => {
            if (!item.product?._id) {
                throw new Error(`Product ID is missing in item: ${JSON.stringify(item)}`);
            }

            const product = await Product.findById(item.product._id);
            if (!product) {
                throw new Error(`Product ${item.product._id} not found`);
            }
            return {
                product: item.product._id,
                quantity: item.quantity,
                price: product.price
            };
        }));

        // Create shipping address object
        const shippingAddress = {
            street: address,
            city,
            state,
            zipCode: zip,
            country
        };

        const paymentDetails = {
            type: paymentMethod
        };

        let paymentDisplayName = 'Unknown Payment Method';
        let computedPaymentStatus = 'pending';

        if (paymentMethod === 'credit-card') {
            let cardMetadata;

            if (savedPaymentMethodId) {
                const savedMethod = userDoc.savedPaymentMethods.id(savedPaymentMethodId);
                if (!savedMethod) {
                    throw new Error('Saved payment method not found');
                }

                cardMetadata = {
                    last4: savedMethod.last4,
                    brand: savedMethod.brand,
                    cardholderName: savedMethod.cardholderName,
                    expiryMonth: savedMethod.expiryMonth,
                    expiryYear: savedMethod.expiryYear
                };
                paymentDetails.savedPaymentMethodId = savedMethod._id;
            } else {
                const sanitizedCardNumber = sanitizeCardNumber(cardNumber);
                if (!sanitizedCardNumber || sanitizedCardNumber.length < 4) {
                    throw new Error('Valid card number is required for card payments');
                }

                const { month: expiryMonth, year: expiryYear } = parseExpiryDate(expiryDate);
                if (!expiryMonth || !expiryYear) {
                    throw new Error('Valid expiry date is required for card payments');
                }

                cardMetadata = {
                    last4: sanitizedCardNumber.slice(-4),
                    brand: detectCardBrand(sanitizedCardNumber),
                    cardholderName: cardName,
                    expiryMonth,
                    expiryYear
                };
            }

            paymentDetails.card = cardMetadata;
            paymentDisplayName = `${cardMetadata.brand || 'Card'} ending •••• ${cardMetadata.last4}`;
        } else if (paymentMethod === 'paypal') {
            paymentDetails.wallet = {
                provider: 'PayPal',
                accountEmail: email
            };
            paymentDisplayName = 'PayPal';
        } else if (paymentMethod === 'upi-app') {
            const upiMetadata = {
                appName: upiApp || 'UPI App',
                vpa: upiVpa || DEFAULT_UPI_VPA,
                transactionReference: upiTransactionId || null,
                status: upiStatus || (upiTransactionId ? 'initiated' : 'pending'),
                intentUrl: upiIntentUrl || null
            };

            if (upiMetadata.status === 'paid') {
                upiMetadata.paidAt = new Date();
                computedPaymentStatus = 'completed';
            }

            paymentDetails.upi = upiMetadata;
            paymentDisplayName = `UPI (${upiMetadata.appName})`;
        } else {
            paymentDisplayName = paymentMethod;
        }

        // Create new order
        const order = new Order({
            user: req.user.userId,
            products: validatedProducts,
            totalAmount: total,
            shippingAddress,
            paymentMethod,
            paymentDisplayName,
            paymentDetails,
            contactInfo: {
                firstName,
                lastName,
                email,
                phone
            },
            status: 'pending',
            paymentStatus: computedPaymentStatus,
            taxAmount: tax,
            subtotal: subtotal
        });

        // Save order
        const savedOrder = await order.save();

        // Add order reference to user
        await User.findByIdAndUpdate(req.user.userId, {
            $push: { orders: savedOrder._id }
        });

        // **THIS IS THE KEY FIX: Update budget spending after order is created**
        await updateUserBudgetSpending(req.user.userId, validatedProducts);

        const populatedOrder = await Order.findById(savedOrder._id)
            .populate({
                path: 'products.product',
                select: 'name price discountPrice images'
            });

        triggerRecommendationMetricsUpdate();

        await recordActivity({
            type: 'purchase',
            message: `${userDoc.name || userDoc.email} placed order #${savedOrder._id.toString().slice(-6)} using ${paymentDisplayName}`,
            user: userDoc._id,
            order: savedOrder._id,
            details: {
                paymentMethod: paymentDisplayName,
                totalAmount: Number(total),
                itemCount: Array.isArray(items) ? items.length : 0
            }
        });

        res.status(201).json({
            success: true,
            order: transformOrderForClient(populatedOrder || savedOrder),
            orderId: savedOrder._id
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.stack // Only in development
        });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.userId }) // Changed from _id to userId
            .populate({
                path: 'products.product',
                select: 'name price images discountPrice'
            })
            .sort({ createdAt: -1 });

        const formattedOrders = orders.map(order => {
            const formatted = transformOrderForClient(order);
            return {
                ...formatted,
                items: (formatted.products || []).map(item => ({
                    product: {
                        ...item.product,
                        _id: item.product?._id
                    },
                    quantity: item.quantity,
                    selectedColor: item.selectedColor || null,
                    selectedSize: item.selectedSize || null
                })),
                total: formatted.totalAmount
            };
        });

        res.status(200).json({
            success: true,
            orders: formattedOrders
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('products.product')
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Ensure user can only access their own orders
        if (order.user._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Transform the order data to match frontend expectations
        const transformedOrder = transformOrderForClient(order);

        if (!transformedOrder) {
            throw new Error('Unable to transform order');
        }

        transformedOrder.items = (transformedOrder.products || []).map(item => ({
            product: {
                id: item.product?._id,
                _id: item.product?._id,
                name: item.product?.name,
                price: item.product?.price,
                discountPrice: item.product?.discountPrice,
                images: item.product?.images
            },
            quantity: item.quantity,
            selectedColor: item.selectedColor || null,
            selectedSize: item.selectedSize || null
        }));

        transformedOrder.total = transformedOrder.totalAmount;

        res.json({
            success: true,
            order: transformedOrder
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order details'
        });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('products.product')
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Ensure user can only access their own orders
        if (order.user._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const filePath = await generateInvoice(order);
        res.download(filePath);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating invoice'
        });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    downloadInvoice
};