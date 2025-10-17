const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { getSocket } = require('../utils/socket');

const { Types } = mongoose;

const INVALID_STRING_IDS = new Set(['null', 'undefined', '', 'nan']);

const normalizeProductId = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (Array.isArray(value)) {
        for (const candidate of value) {
            const resolved = normalizeProductId(candidate);
            if (resolved) {
                return resolved;
            }
        }
        return null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const normalized = trimmed.toLowerCase();
        if (INVALID_STRING_IDS.has(normalized)) {
            return null;
        }

        if (trimmed === '[object Object]' || trimmed.includes('[object Object]')) {
            return null;
        }

        return trimmed;
    }

    if (value instanceof Types.ObjectId) {
        return value.toString();
    }

    if (Types.ObjectId.isValid(value)) {
        return value.toString();
    }

    if (value && typeof value === 'object') {
        if (value.productId !== undefined && value.productId !== null) {
            const nested = normalizeProductId(value.productId);
            if (nested) {
                return nested;
            }
        }

        if (value._id !== undefined && value._id !== null) {
            const nested = normalizeProductId(value._id);
            if (nested) {
                return nested;
            }
        }

        if (value.id !== undefined && value.id !== null) {
            const nested = normalizeProductId(value.id);
            if (nested) {
                return nested;
            }
        }

        if (value.product !== undefined && value.product !== null) {
            const nested = normalizeProductId(value.product);
            if (nested) {
                return nested;
            }
        }

        if (typeof value.toString === 'function') {
            const stringValue = value.toString();
            if (stringValue && stringValue !== '[object Object]') {
                return normalizeProductId(stringValue);
            }
        }
    }

    return null;
};

const mergeMetadata = (target = {}, metadata = {}) => {
    if (!metadata || typeof metadata !== 'object') {
        return target;
    }

    const fields = ['name', 'brand', 'category', 'primaryImage', 'price', 'discountPrice', 'images'];
    fields.forEach((field) => {
        if ((target[field] === undefined || target[field] === null || target[field] === '') && metadata[field] !== undefined && metadata[field] !== null) {
            target[field] = metadata[field];
        }
    });

    return target;
};

const createEmptyMetrics = (warning = null) => ({
    summary: {
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        avgCtr: 0,
        avgCvr: 0,
    },
    products: [],
    updatedAt: new Date().toISOString(),
    degraded: Boolean(warning),
    warnings: warning ? [warning] : [],
});

const extractProductMetadata = (source) => {
    if (source === null || source === undefined) {
        return null;
    }

    if (Array.isArray(source)) {
        for (const candidate of source) {
            const metadata = extractProductMetadata(candidate);
            if (metadata) {
                return metadata;
            }
        }
        return null;
    }

    if (typeof source !== 'object') {
        return null;
    }

    const base = (source && typeof source.snapshot === 'object' && source.snapshot) ? source.snapshot : source;
    const images = Array.isArray(base?.images) ? base.images : Array.isArray(source.images) ? source.images : [];
    const primaryImage = base?.primaryImage || source.primaryImage || (images.length > 0 ? images[0] : null);

    return {
        name: base?.name || source.name || null,
        brand: base?.brand || source.brand || null,
        category: base?.category || source.category || null,
        primaryImage,
        images,
        price: base?.price ?? source.price ?? null,
        discountPrice: base?.discountPrice ?? source.discountPrice ?? null,
    };
};

const fetchUsersForMetrics = async () => {
    try {
        return await User.find({}, 'styleSuggestions wishlist cart').lean();
    } catch (error) {
        console.error('Failed to fetch users for recommendation metrics:', error);
        return [];
    }
};

const fetchOrdersForMetrics = async () => {
    try {
        return await Order.find({}, 'products products.product products.quantity products.price').lean();
    } catch (error) {
        if (error?.name === 'CastError') {
            console.warn('Encountered invalid order product reference while computing recommendation metrics. Falling back to raw documents.');
            try {
                const rawOrders = await Order.collection.find({}, { projection: { products: 1 } }).toArray();
                return rawOrders.map((doc) => ({
                    products: Array.isArray(doc?.products)
                        ? doc.products.map((item) => ({
                            product: item?.product,
                            quantity: item?.quantity,
                            price: item?.price,
                        }))
                        : [],
                }));
            } catch (fallbackError) {
                console.error('Fallback order fetch for recommendation metrics failed:', fallbackError);
                return [];
            }
        }

        console.error('Failed to fetch orders for recommendation metrics:', error);
        return [];
    }
};

const ensureEntry = (map, productId, metadata) => {
    if (!productId) return null;
    const key = productId.toString();

    if (!map.has(key)) {
        map.set(key, {
            productId: key,
            metadata: mergeMetadata({}, metadata),
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
        });
    } else if (metadata) {
        const entry = map.get(key);
        entry.metadata = mergeMetadata(entry.metadata, metadata);
    }

    return map.get(key);
};

const accumulateImpression = (map, productId, metadata) => {
    const entry = ensureEntry(map, productId, metadata);
    if (entry) {
        entry.impressions += 1;
    }
};

const accumulateClick = (map, productId, metadata, weight = 1) => {
    const entry = ensureEntry(map, productId, metadata);
    if (entry) {
        entry.clicks += weight;
    }
};

const accumulateConversion = (map, productId, metadata, quantity = 1, revenue = 0) => {
    const entry = ensureEntry(map, productId, metadata);
    if (entry) {
        entry.conversions += quantity;
        entry.revenue += revenue;
    }
};

const buildProductMetrics = async (metricsMap) => {
    const productIds = Array.from(metricsMap.keys());
    if (productIds.length === 0) {
        return [];
    }

    const validObjectIds = productIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

    let products = [];
    if (validObjectIds.length > 0) {
        products = await Product.find({ _id: { $in: validObjectIds } })
            .select('name images price discountPrice brand category');
    }

    const productIndex = new Map(products.map((product) => [product._id.toString(), product]));

    return productIds.map((productId) => {
        const metrics = metricsMap.get(productId);
        const product = productIndex.get(productId);
        const fallback = metrics?.metadata || {};

        const impressions = metrics.impressions;
        const clicks = metrics.clicks;
        const conversions = metrics.conversions;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;

        const primaryImage = product?.images?.[0] || fallback.primaryImage || (Array.isArray(fallback.images) ? fallback.images[0] : null) || null;

        return {
            id: productId,
            name: product?.name || fallback.name || 'Unknown Product',
            brand: product?.brand || fallback.brand || null,
            category: product?.category || fallback.category || null,
            primaryImage,
            impressions,
            clicks,
            conversions,
            ctr,
            cvr,
            revenue: metrics.revenue,
        };
    });
};

const computeRecommendationMetrics = async () => {
    try {
        const metricsMap = new Map();

        const [users, orders] = await Promise.all([
            fetchUsersForMetrics(),
            fetchOrdersForMetrics(),
        ]);

        users.forEach((user) => {
            try {
                const outfits = Array.isArray(user?.styleSuggestions?.outfits)
                    ? user.styleSuggestions.outfits
                    : [];

                outfits.forEach((outfit) => {
                    ['top', 'bottom', 'accessory'].forEach((slot) => {
                        const productData = outfit?.[slot];
                        const productId = normalizeProductId(productData);
                        if (productId) {
                            const metadata = extractProductMetadata(productData);
                            accumulateImpression(metricsMap, productId, metadata);
                        }
                    });
                });

                const wishlistItems = Array.isArray(user?.wishlist) ? user.wishlist : [];
                wishlistItems.forEach((item) => {
                    const productId = normalizeProductId(item);
                    if (productId) {
                        accumulateClick(metricsMap, productId, null, 1);
                    }
                });

                const cartItems = Array.isArray(user?.cart?.items) ? user.cart.items : [];
                cartItems.forEach((item) => {
                    const productId = normalizeProductId(item?.product);
                    if (productId) {
                        const quantity = Number(item?.quantity) || 1;
                        accumulateClick(metricsMap, productId, null, quantity);
                    }
                });
            } catch (error) {
                console.warn('Skipped user while computing recommendation metrics due to invalid data:', error);
            }
        });

        orders.forEach((order) => {
            try {
                const products = Array.isArray(order?.products) ? order.products : [];
                products.forEach((item) => {
                    const productId = normalizeProductId(item?.product);
                    if (!productId) {
                        return;
                    }

                    const quantity = Number(item?.quantity);
                    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
                    const price = Number(item?.price);
                    const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;

                    const metadata = {
                        price: safePrice,
                        discountPrice: safePrice,
                    };

                    accumulateConversion(metricsMap, productId, metadata, safeQuantity, safePrice * safeQuantity);
                });
            } catch (error) {
                console.warn('Skipped order while computing recommendation metrics due to invalid data:', error);
            }
        });

        const productMetrics = await buildProductMetrics(metricsMap);

        const totals = productMetrics.reduce(
            (acc, metric) => {
                acc.impressions += metric.impressions;
                acc.clicks += metric.clicks;
                acc.conversions += metric.conversions;
                acc.revenue += metric.revenue;
                return acc;
            },
            { impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
        );

        const summary = {
            totalImpressions: totals.impressions,
            totalClicks: totals.clicks,
            totalConversions: totals.conversions,
            totalRevenue: totals.revenue,
            avgCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
            avgCvr: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        };

        const sortedProducts = productMetrics.sort((a, b) => {
            if (b.conversions !== a.conversions) {
                return b.conversions - a.conversions;
            }
            if (b.clicks !== a.clicks) {
                return b.clicks - a.clicks;
            }
            return b.impressions - a.impressions;
        });

        return {
            summary,
            products: sortedProducts,
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Failed to compute recommendation metrics:', error);
        const warning = process.env.NODE_ENV === 'development'
            ? `Recommendation metrics degraded: ${error.message}`
            : 'Recommendation metrics temporarily unavailable; displaying zeros until data loads.';
        return createEmptyMetrics(warning);
    }
};

const broadcastRecommendationMetrics = async () => {
    const metrics = await computeRecommendationMetrics();
    try {
        const socket = getSocket();
        socket.emit('recommendation-metrics', metrics);
    } catch (error) {
        // Socket may not be initialized during server boot or tests.
        console.warn('Recommendation metrics broadcast skipped:', error.message);
    }
    return metrics;
};

let broadcastTimeout = null;

const triggerRecommendationMetricsUpdate = () => {
    if (broadcastTimeout) {
        clearTimeout(broadcastTimeout);
    }

    broadcastTimeout = setTimeout(async () => {
        try {
            await broadcastRecommendationMetrics();
        } catch (error) {
            console.error('Failed to broadcast recommendation metrics:', error);
        }
    }, 300);
};

module.exports = {
    computeRecommendationMetrics,
    broadcastRecommendationMetrics,
    triggerRecommendationMetricsUpdate,
};
