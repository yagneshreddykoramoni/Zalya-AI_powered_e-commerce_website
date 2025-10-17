const Product = require('../models/Product');
const User = require('../models/User');
const { Groq } = require('groq-sdk');
const { triggerRecommendationMetricsUpdate } = require('../services/recommendationMetrics');

const resolveProductId = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Object && value.toString && typeof value.toString === 'function') {
        const stringValue = value.toString();
        if (stringValue && stringValue !== '[object Object]') {
            return stringValue;
        }
    }

    if (value && typeof value === 'object') {
        const nested = value.productId || value._id || value.id;
        if (nested) {
            return resolveProductId(nested);
        }
    }

    return null;
};

const isSanitizedSuggestionProduct = (product) => {
    return Boolean(
        product &&
        typeof product === 'object' &&
        typeof product.productId === 'string' &&
        product._id === product.productId &&
        product.id === product.productId &&
        Array.isArray(product.images)
    );
};

const sanitizeSuggestionProduct = (product) => {
    if (!product) {
        return { value: null, changed: Boolean(product) };
    }

    if (isSanitizedSuggestionProduct(product)) {
        if (!product.primaryImage && Array.isArray(product.images) && product.images.length > 0) {
            product.primaryImage = product.images[0];
            return { value: product, changed: true };
        }
        return { value: product, changed: false };
    }

    const base = (product && typeof product.snapshot === 'object') ? product.snapshot : product;
    const productId = resolveProductId(product);

    if (!productId) {
        return { value: null, changed: true };
    }

    const images = Array.isArray(base?.images)
        ? base.images
        : Array.isArray(product?.images)
            ? product.images
            : [];

    const primaryImage = base?.primaryImage || product?.primaryImage || (images.length > 0 ? images[0] : null);

    const sanitized = {
        productId: productId,
        _id: productId,
        id: productId,
        name: base?.name || product?.name || null,
        brand: base?.brand || product?.brand || null,
        category: base?.category || product?.category || null,
        price: typeof base?.price === 'number' ? base.price : (typeof product?.price === 'number' ? product.price : null),
        discountPrice: typeof base?.discountPrice === 'number' ? base.discountPrice : (typeof product?.discountPrice === 'number' ? product.discountPrice : null),
        images: images.length > 0 ? images : (primaryImage ? [primaryImage] : []),
        primaryImage: primaryImage || null,
        colors: Array.isArray(base?.colors) ? base.colors : (Array.isArray(product?.colors) ? product.colors : []),
        sizes: Array.isArray(base?.sizes) ? base.sizes : (Array.isArray(product?.sizes) ? product.sizes : []),
    };

    if (!sanitized.primaryImage && sanitized.images.length > 0) {
        sanitized.primaryImage = sanitized.images[0];
    }

    return { value: sanitized, changed: true };
};

const normalizeOutfitsForStorage = (outfits = []) => {
    const normalized = [];
    let changed = false;

    outfits.forEach((outfit) => {
        if (!outfit || typeof outfit !== 'object') {
            changed = true;
            return;
        }

        const { value: top, changed: topChanged } = sanitizeSuggestionProduct(outfit.top);
        const { value: bottom, changed: bottomChanged } = sanitizeSuggestionProduct(outfit.bottom);
        const { value: accessory, changed: accessoryChanged } = sanitizeSuggestionProduct(outfit.accessory);

        if (top && bottom) {
            normalized.push({
                top,
                bottom,
                accessory: accessory || null,
            });
            if (topChanged || bottomChanged || accessoryChanged) {
                changed = true;
            }
        } else {
            changed = true;
        }
    });

    return { outfits: normalized, changed };
};

// Initialize Groq API client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Detect gender from username using AI (with robust fallback)
async function detectGenderFromName(name) {
    if (!name || typeof name !== 'string') {
        console.log('No name provided, defaulting to men');
        return 'men';
    }

    // First try heuristic (fast and reliable)
    const heuristicResult = detectGenderHeuristic(name);

    // Only use AI if heuristic returns unisex
    if (heuristicResult !== 'unisex') {
        console.log(`Gender detected from heuristics: ${heuristicResult} for name: ${name}`);
        return heuristicResult;
    }

    // Try AI as fallback
    try {
        const prompt = `Based on the name "${name}", determine if this is typically a male, female, or gender-neutral name. 
        Respond with ONLY one word: "male", "female", or "unisex". No explanation needed.`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 10
        });

        const gender = completion.choices[0]?.message?.content?.trim().toLowerCase();
        console.log(`AI detected gender: ${gender} for name: ${name}`);

        // Map AI response to our categories
        if (gender === 'male') return 'men';
        if (gender === 'female') return 'women';
        return 'men';
    } catch (error) {
        console.error('Error detecting gender with AI:', error);
        // Return men as safe default
        return 'men';
    }
}

// Fallback heuristic gender detection
function detectGenderHeuristic(name) {
    const lowerName = name.toLowerCase();

    // Common male name patterns/endings
    const malePatterns = ['john', 'michael', 'david', 'james', 'robert', 'william', 'richard', 'charles', 'joseph', 'thomas'];
    const maleEndings = ['o', 'son', 'raj', 'deep', 'kumar', 'singh'];

    // Common female name patterns/endings
    const femalePatterns = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen'];
    const femaleEndings = ['a', 'i', 'sha', 'ika', 'ya', 'na', 'ini', 'ka'];

    // Check patterns
    for (const pattern of malePatterns) {
        if (lowerName.includes(pattern)) return 'men';
    }

    for (const pattern of femalePatterns) {
        if (lowerName.includes(pattern)) return 'women';
    }

    // Check endings
    for (const ending of femaleEndings) {
        if (lowerName.endsWith(ending)) return 'women';
    }

    for (const ending of maleEndings) {
        if (lowerName.endsWith(ending)) return 'men';
    }

    return 'unisex';
}

// Helper function to detect gender from product
function getProductGender(product) {
    const text = `${product.name} ${product.category} ${product.subcategory} ${product.description || ''}`.toLowerCase();

    // Check for explicit gender keywords
    if (text.includes('men') || text.includes('male') || text.includes('boy')) {
        return 'men';
    }
    if (text.includes('women') || text.includes('female') || text.includes('girl') || text.includes('lady') || text.includes('ladies')) {
        return 'women';
    }
    return 'unisex';
}

// Get categorized products (tops, bottoms, accessories)
async function getCategorizedProducts(gender, limit = 5) {
    console.log(`Fetching products for gender: ${gender}`);

    // Build gender filter with better keyword matching
    let genderKeywords = [];
    if (gender === 'men') {
        genderKeywords = ['men', 'male', 'boy', "men's"];
    } else if (gender === 'women') {
        genderKeywords = ['women', 'female', 'girl', 'lady', 'ladies', "women's"];
    }

    let genderFilter = {};
    if (gender !== 'unisex' && genderKeywords.length > 0) {
        genderFilter = {
            $or: genderKeywords.map(keyword => [
                { category: { $regex: keyword, $options: 'i' } },
                { subcategory: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } },
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ]).flat()
        };
    }

    // Define category mappings - broader search
    const topCategories = ['shirt', 'blouse', 't-shirt', 'tshirt', 'top', 'sweater', 'hoodie', 'jacket', 'blazer', 'coat'];
    const bottomCategories = ['pants', 'jeans', 'jean', 'trouser', 'shorts', 'short', 'skirt', 'legging'];
    const accessoryCategories = ['watch', 'belt', 'bag', 'backpack', 'hat', 'cap', 'scarf', 'sunglasses', 'jewelry', 'jewellery', 'accessory'];

    // Build category filters
    const topFilter = {
        $or: topCategories.map(cat => [
            { category: { $regex: cat, $options: 'i' } },
            { subcategory: { $regex: cat, $options: 'i' } },
            { name: { $regex: cat, $options: 'i' } }
        ]).flat()
    };

    const bottomFilter = {
        $or: bottomCategories.map(cat => [
            { category: { $regex: cat, $options: 'i' } },
            { subcategory: { $regex: cat, $options: 'i' } },
            { name: { $regex: cat, $options: 'i' } }
        ]).flat()
    };

    const accessoryFilter = {
        $or: accessoryCategories.map(cat => [
            { category: { $regex: cat, $options: 'i' } },
            { subcategory: { $regex: cat, $options: 'i' } },
            { name: { $regex: cat, $options: 'i' } }
        ]).flat()
    };

    // Get tops
    let tops = await Product.find({
        ...genderFilter,
        ...topFilter,
        stock: { $gt: 0 }
    })
        .sort({ rating: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    // Get bottoms
    let bottoms = await Product.find({
        ...genderFilter,
        ...bottomFilter,
        stock: { $gt: 0 }
    })
        .sort({ rating: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    // Get accessories
    let accessories = await Product.find({
        ...genderFilter,
        ...accessoryFilter,
        stock: { $gt: 0 }
    })
        .sort({ rating: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    console.log(`Found products - Tops: ${tops.length}, Bottoms: ${bottoms.length}, Accessories: ${accessories.length}`);

    // Post-filter to ensure gender consistency if we have a specific gender
    if (gender !== 'unisex') {
        const oppositeGender = gender === 'men' ? 'women' : 'men';

        // Filter out products that explicitly belong to opposite gender
        tops = tops.filter(product => {
            const productGender = getProductGender(product);
            return productGender === gender || productGender === 'men';
        });

        bottoms = bottoms.filter(product => {
            const productGender = getProductGender(product);
            return productGender === gender || productGender === 'men';
        });

        accessories = accessories.filter(product => {
            const productGender = getProductGender(product);
            return productGender === gender || productGender === 'unisex';
        });

        console.log(`After gender filtering - Tops: ${tops.length}, Bottoms: ${bottoms.length}, Accessories: ${accessories.length}`);
    }

    // If no products found with gender filter, try without it (only for accessories)
    if (tops.length === 0) {
        console.log('No tops found with gender filter, trying without...');
        let allTops = await Product.find({
            ...topFilter,
            stock: { $gt: 0 }
        })
            .sort({ rating: -1, createdAt: -1 })
            .limit(limit * 2)
            .lean();

        // Filter by gender from product name
        if (gender !== 'unisex') {
            tops = allTops.filter(product => {
                const productGender = getProductGender(product);
                return productGender === gender || productGender === 'unisex';
            }).slice(0, limit);
        } else {
            tops = allTops.slice(0, limit);
        }
    }

    if (bottoms.length === 0) {
        console.log('No bottoms found with gender filter, trying without...');
        let allBottoms = await Product.find({
            ...bottomFilter,
            stock: { $gt: 0 }
        })
            .sort({ rating: -1, createdAt: -1 })
            .limit(limit * 2)
            .lean();

        // Filter by gender from product name
        if (gender !== 'unisex') {
            bottoms = allBottoms.filter(product => {
                const productGender = getProductGender(product);
                return productGender === gender || productGender === 'unisex';
            }).slice(0, limit);
        } else {
            bottoms = allBottoms.slice(0, limit);
        }
    }

    if (accessories.length === 0) {
        console.log('No accessories found with gender filter, trying without...');
        accessories = await Product.find({
            ...accessoryFilter,
            stock: { $gt: 0 }
        })
            .sort({ rating: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        // Accessories are more unisex, so we're less strict here
        if (gender !== 'unisex') {
            accessories = accessories.filter(product => {
                const productGender = getProductGender(product);
                return productGender !== (gender === 'men' ? 'women' : 'men');
            });
        }
    }

    console.log(`Final products - Tops: ${tops.length}, Bottoms: ${bottoms.length}, Accessories: ${accessories.length}`);

    return { tops, bottoms, accessories };
}

// Simple seeded random function for consistent user-based randomization
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Shuffle array using user-seeded randomization
function shuffleWithSeed(array, seed) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate outfit combinations with user-based personalization
function generateOutfits(tops, bottoms, accessories, maxOutfits = 3, userSeed = Date.now(), requiredGender = null) {
    const outfits = [];

    // Shuffle products based on user seed for personalization
    const shuffledTops = shuffleWithSeed(tops, userSeed);
    const shuffledBottoms = shuffleWithSeed(bottoms, userSeed + 1000);
    const shuffledAccessories = shuffleWithSeed(accessories, userSeed + 2000);

    // Create combinations with strict gender validation
    for (let i = 0; i < Math.min(maxOutfits, shuffledTops.length); i++) {
        const top = shuffledTops[i] || null;
        const bottom = shuffledBottoms[i % shuffledBottoms.length] || null;
        let accessory = shuffledAccessories[i % shuffledAccessories.length] || null;

        // Strict gender validation if gender is specified
        if (requiredGender && requiredGender !== 'unisex') {
            const oppositeGender = requiredGender === 'men' ? 'women' : 'men';

            // Validate top
            if (top) {
                const topGender = getProductGender(top);
                if (topGender === oppositeGender) {
                    console.log(`Filtered out opposite gender top: ${top.name} (detected: ${topGender}, required: ${requiredGender})`);
                    continue; // Skip this outfit
                }
            }

            // Validate bottom
            if (bottom) {
                const bottomGender = getProductGender(bottom);
                if (bottomGender === oppositeGender) {
                    console.log(`Filtered out opposite gender bottom: ${bottom.name} (detected: ${bottomGender}, required: ${requiredGender})`);
                    continue; // Skip this outfit
                }
            }

            // Validate accessory (less strict, only block opposite gender)
            if (accessory) {
                const accessoryGender = getProductGender(accessory);
                if (accessoryGender === oppositeGender) {
                    console.log(`Filtered out opposite gender accessory: ${accessory.name} (detected: ${accessoryGender}, required: ${requiredGender})`);
                    // Replace with null instead of skipping outfit
                    accessory = null;
                }
            }
        }

        const outfit = { top, bottom, accessory };

        // Only add if we have at least top and bottom
        if (outfit.top && outfit.bottom) {
            outfits.push(outfit);
        }
    }

    return outfits;
}

// Fallback generator for product-specific style suggestions
function generateProductFallbackSuggestions(product) {
    const name = product?.name || 'this piece';
    const category = (product?.category || 'outfit').toLowerCase();
    const primaryColor = product?.colors && product.colors.length > 0 ? product.colors[0].toLowerCase() : null;
    const texture = product?.material ? product.material.toLowerCase() : null;

    const neutralDescriptor = primaryColor ? `${primaryColor} accents` : 'soft neutrals';
    const stylingFocus = texture ? `${texture} texture` : 'clean lines';

    const lineOne = `Let ${name} stand out by pairing it with ${neutralDescriptor} that highlight its ${stylingFocus}.`;

    const finishingTouch = category.includes('dress')
        ? 'layered jewelry and strappy heels'
        : category.includes('shirt') || category.includes('top')
            ? 'tailored bottoms and polished footwear'
            : category.includes('pants') || category.includes('jeans')
                ? 'a fitted top and sleek accessories'
                : 'minimal accessories to keep the look refined';

    const lineTwo = `Complete the look with ${finishingTouch} for a balanced, confident silhouette.`;

    return [lineOne, lineTwo];
}

// Normalize AI response down to two concise lines
function parseAISuggestionLines(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return [];
    }

    const cleanedLines = rawText
        .split(/\r?\n+/)
        .map(line => line
            .replace(/^(?:line\s*\d+\s*[:.\-]*)/i, '')
            .replace(/^[-•\s]+/, '')
            .trim())
        .filter(Boolean);

    if (cleanedLines.length >= 2) {
        return cleanedLines.slice(0, 2);
    }

    const sentenceSplits = rawText
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);

    if (sentenceSplits.length >= 2) {
        return sentenceSplits.slice(0, 2);
    }

    return cleanedLines.length > 0 ? cleanedLines : sentenceSplits;
}

// Generate real-time style suggestions for a specific product
exports.getProductStyleSuggestion = async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    let product;

    try {
        product = await Product.findById(productId).lean();
    } catch (error) {
        console.error('Error loading product for style suggestion:', error);
        return res.status(500).json({ message: 'Failed to load product for style suggestion' });
    }

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const fallbackSuggestions = generateProductFallbackSuggestions(product);
    const basePayload = {
        productId: product._id?.toString() || productId,
        productName: product.name,
    };

    if (!process.env.GROQ_API_KEY) {
        console.warn('GROQ_API_KEY missing. Returning fallback style suggestions.');
        return res.json({
            ...basePayload,
            suggestions: fallbackSuggestions,
            source: 'fallback',
        });
    }

    try {
        const trimmedDescription = (product.description || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 600);

        const prompt = `You are an experienced fashion stylist writing quick tips for shoppers. ` +
            `Read the product details and craft exactly two distinct styling lines. ` +
            `Each line should be 10-18 words, practical, and avoid hype language. ` +
            `Focus on complementary pieces, color balance, and finishing touches. ` +
            `Avoid repeating the product name twice, avoid bullet points, and avoid marketing jargon.\n\n` +
            `Product name: ${product.name}\n` +
            `Category: ${product.category || 'N/A'}\n` +
            `Subcategory: ${product.subcategory || 'N/A'}\n` +
            `Tags: ${(product.tags || []).join(', ') || 'none'}\n` +
            `Colors: ${(product.colors || []).join(', ') || 'unspecified'}\n` +
            `Material: ${product.material || 'unspecified'}\n` +
            `Description: ${trimmedDescription || 'No description available.'}\n\n` +
            `Respond exactly in this format:\n` +
            `Line 1: <first styling line>\n` +
            `Line 2: <second styling line>`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.55,
            max_tokens: 150,
            messages: [
                {
                    role: 'system',
                    content: 'You are a concise, trend-aware fashion stylist who gives grounded outfit advice.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const aiContent = completion.choices?.[0]?.message?.content?.trim();
        const parsedLines = parseAISuggestionLines(aiContent);

        if (parsedLines && parsedLines.length >= 2) {
            return res.json({
                ...basePayload,
                suggestions: parsedLines.slice(0, 2),
                source: 'ai',
            });
        }

        console.warn('AI response did not yield two lines. Using fallback suggestions.');
        return res.json({
            ...basePayload,
            suggestions: fallbackSuggestions,
            source: 'fallback',
        });

    } catch (error) {
        console.error('Error generating AI style suggestion:', error);
        return res.json({
            ...basePayload,
            suggestions: fallbackSuggestions,
            source: 'fallback',
        });
    }
};

// Main controller to get style suggestions
exports.getStyleSuggestions = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`Getting style suggestions for user: ${userId}`);

        // Get user data
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`User found: ${user.name}`);

        let cachedOutfits = [];
        let normalizationChanged = false;

        if (user.styleSuggestions?.outfits?.length) {
            const normalization = normalizeOutfitsForStorage(user.styleSuggestions.outfits);
            cachedOutfits = normalization.outfits;
            normalizationChanged = normalization.changed;

            if (normalizationChanged) {
                user.styleSuggestions.outfits = cachedOutfits;
                await user.save();
            }
        }

        const hasCachedSuggestions = Boolean(
            user.styleSuggestions &&
            user.styleSuggestions.lastUpdated &&
            cachedOutfits.length > 0
        );

        if (hasCachedSuggestions) {
            console.log(`Returning cached suggestions for user ${userId} (last updated ${user.styleSuggestions.lastUpdated})`);
            return res.json({
                gender: user.styleSuggestions.gender,
                outfits: cachedOutfits.slice(0, 1),
                lastUpdated: user.styleSuggestions.lastUpdated,
                cached: true
            });
        }

        console.log('No cached suggestions found, generating first-time suggestions...');

        // Detect gender from username
        const gender = await detectGenderFromName(user.name);
        console.log(`Detected gender for ${user.name}: ${gender}`);

        // Get categorized products
        const { tops, bottoms, accessories } = await getCategorizedProducts(gender, 5);

        // Check if we have enough products
        if (tops.length === 0 || bottoms.length === 0) {
            console.error('Not enough products found in database');

            // Try to get ANY products as fallback
            const anyProducts = await Product.find({ stock: { $gt: 0 } }).limit(10).lean();
            console.log(`Found ${anyProducts.length} total products in database`);

            return res.status(404).json({
                message: 'Not enough products available to generate outfits. Please ensure your database has products with categories containing keywords like: shirt, t-shirt, pants, jeans, watch, bag, etc.',
                debug: {
                    tops: tops.length,
                    bottoms: bottoms.length,
                    accessories: accessories.length,
                    totalProducts: anyProducts.length,
                    sampleCategories: anyProducts.slice(0, 3).map(p => ({ name: p.name, category: p.category, subcategory: p.subcategory }))
                }
            });
        }

        // Generate outfit combination (single outfit) with user-based seed for personalization
        const userSeed = parseInt(userId.toString().slice(-8), 16); // Convert last 8 chars of userId to number
        const generatedOutfits = generateOutfits(tops, bottoms, accessories, 1, userSeed, gender);

        console.log(`Generated ${generatedOutfits.length} personalized outfit for user ${userId} (gender: ${gender})`);

        if (generatedOutfits.length === 0) {
            return res.status(404).json({
                message: 'Could not generate outfit combinations',
                debug: {
                    tops: tops.length,
                    bottoms: bottoms.length,
                    accessories: accessories.length
                }
            });
        }

        const { outfits: sanitizedOutfits } = normalizeOutfitsForStorage(generatedOutfits);

        if (!sanitizedOutfits.length) {
            return res.status(404).json({
                message: 'Unable to prepare outfit suggestions due to missing product data',
            });
        }

        // Save suggestions to user document
        user.styleSuggestions = {
            gender,
            outfits: sanitizedOutfits,
            lastUpdated: new Date()
        };
        await user.save();
        triggerRecommendationMetricsUpdate();

        console.log('Suggestions saved successfully');

        res.json({
            gender,
            outfits: sanitizedOutfits,
            lastUpdated: user.styleSuggestions.lastUpdated,
            cached: false
        });

    } catch (error) {
        console.error('Error generating style suggestions:', error);
        res.status(500).json({
            message: 'Failed to generate style suggestions',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Force refresh suggestions (ignores cache)
exports.refreshStyleSuggestions = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Detect gender
        const gender = await detectGenderFromName(user.name);
        console.log(`Refreshing suggestions for ${user.name}, gender: ${gender}`);

        // Get fresh products with strict gender filtering
        let { tops, bottoms, accessories } = await getCategorizedProducts(gender, 10); // Get more products for better filtering

        // Generate outfit (single outfit) with user-based seed for personalization
        const userSeed = parseInt(userId.toString().slice(-8), 16) + Date.now(); // Add timestamp for fresh suggestions
        let outfits = generateOutfits(tops, bottoms, accessories, 1, userSeed, gender);

        // If strict filtering resulted in no outfits, try with even more products
        if (outfits.length === 0) {
            console.log('No outfits after strict filtering, fetching more products...');
            const moreProducts = await getCategorizedProducts(gender, 20);
            outfits = generateOutfits(moreProducts.tops, moreProducts.bottoms, moreProducts.accessories, 1, userSeed, gender);
        }

        // Final check
        if (outfits.length === 0) {
            return res.status(404).json({
                message: `Could not generate ${gender} outfit after strict gender filtering. Please add more ${gender}'s products to the database.`,
                debug: {
                    gender,
                    topsFound: tops.length,
                    bottomsFound: bottoms.length,
                    accessoriesFound: accessories.length
                }
            });
        }

        const { outfits: sanitizedOutfits } = normalizeOutfitsForStorage(outfits);

        if (!sanitizedOutfits.length) {
            return res.status(404).json({
                message: 'Unable to prepare refreshed outfit suggestions due to missing product data',
                debug: {
                    gender,
                    topsFound: tops.length,
                    bottomsFound: bottoms.length,
                    accessoriesFound: accessories.length
                }
            });
        }

        // Update user document
        user.styleSuggestions = {
            gender,
            outfits: sanitizedOutfits,
            lastUpdated: new Date()
        };
        await user.save();
        triggerRecommendationMetricsUpdate();

        console.log(`Refresh successful: Generated ${outfits.length} outfit for ${gender} user`);

        res.json({
            gender,
            outfits: sanitizedOutfits,
            lastUpdated: user.styleSuggestions.lastUpdated,
            cached: false
        });

    } catch (error) {
        console.error('Error refreshing style suggestions:', error);
        res.status(500).json({
            message: 'Failed to refresh style suggestions',
            error: error.message
        });
    }
};
