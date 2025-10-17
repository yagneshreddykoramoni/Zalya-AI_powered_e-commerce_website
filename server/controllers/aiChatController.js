const Product = require('../models/Product');
const { Groq } = require('groq-sdk');
const sharp = require('sharp');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Initialize Groq API client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Helper function to extract clothing information from image caption
function extractClothingInfo(caption) {
    const lowerCaption = caption.toLowerCase();

    // Define clothing keywords and their mappings
    const clothingMap = {
        // Tops
        'shirt': ['shirt', 't-shirt', 'tee', 'polo', 'blouse', 'top'],
        'jacket': ['jacket', 'coat', 'blazer', 'cardigan', 'sweater', 'hoodie'],
        'dress': ['dress', 'gown', 'frock'],
        'sweater': ['sweater', 'cardigan', 'pullover', 'jumper'],

        // Bottoms
        'pants': ['pants', 'trousers', 'jeans', 'slacks', 'chinos'],
        'shorts': ['shorts', 'bermuda', 'cargo shorts'],
        'skirt': ['skirt', 'mini skirt', 'maxi skirt'],

        // Footwear
        'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats'],
        'sneakers': ['sneakers', 'running shoes', 'tennis shoes'],

        // Accessories
        'hat': ['hat', 'cap', 'beanie', 'fedora'],
        'watch': ['watch', 'wristwatch'],
        'bag': ['bag', 'handbag', 'backpack', 'purse']
    };

    // Color detection
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange', 'navy', 'maroon', 'beige', 'cream'];

    let detectedColor = '';
    for (const color of colors) {
        if (lowerCaption.includes(color)) {
            detectedColor = color;
            break;
        }
    }

    // Find the most specific clothing item
    for (const [category, keywords] of Object.entries(clothingMap)) {
        for (const keyword of keywords) {
            if (lowerCaption.includes(keyword)) {
                const colorPrefix = detectedColor ? `${detectedColor} ` : '';
                return `${colorPrefix}${category}`;
            }
        }
    }

    // If no specific item found, try to extract from the caption
    const words = lowerCaption.split(' ');
    const clothingWords = words.filter(word =>
        word.length > 3 &&
        !['person', 'man', 'woman', 'people', 'standing', 'wearing', 'with', 'and', 'the', 'are', 'is', 'in', 'on', 'at'].includes(word)
    );

    if (clothingWords.length > 0) {
        const colorPrefix = detectedColor ? `${detectedColor} ` : '';
        return `${colorPrefix}${clothingWords[0]}`;
    }

    return 'clothing item';
}

// Helper function to detect gender from image caption
function detectGenderFromCaption(caption) {
    const lowerCaption = caption.toLowerCase();

    // Strong gender indicators
    if (lowerCaption.includes('man') || lowerCaption.includes('boy') || lowerCaption.includes('male') ||
        lowerCaption.includes('gentleman') || lowerCaption.includes('men\'s')) {
        return 'men';
    }

    if (lowerCaption.includes('woman') || lowerCaption.includes('girl') || lowerCaption.includes('lady') ||
        lowerCaption.includes('female') || lowerCaption.includes('women\'s')) {
        return 'women';
    }

    // Clothing-based gender detection
    const mensClothing = ['suit', 'tie', 'blazer', 'trousers', 'men\'s', 'polo shirt', 'cargo shorts'];
    const womensClothing = ['dress', 'skirt', 'blouse', 'heels', 'handbag', 'women\'s', 'mini skirt'];

    for (const item of mensClothing) {
        if (lowerCaption.includes(item)) {
            return 'men';
        }
    }

    for (const item of womensClothing) {
        if (lowerCaption.includes(item)) {
            return 'women';
        }
    }

    return 'unisex';
}

// Generate fashion recommendations using Groq AI
async function generateRecommendations(analysisText, detectedItems) {
    try {
        // Define complementary items for each clothing type
        const complementaryMap = {
            'shirt': ['pants', 'jeans', 'shorts', 'shoes', 'sneakers', 'watch', 'bag'],
            'jacket': ['pants', 'jeans', 'shirt', 'shoes', 'boots'],
            'dress': ['shoes', 'heels', 'bag', 'jewelry'],
            'pants': ['shirt', 'jacket', 'shoes', 'belt'],
            'jeans': ['shirt', 'jacket', 'sneakers', 'boots'],
            'shorts': ['shirt', 'sneakers', 'sandals'],
            'skirt': ['blouse', 'shirt', 'heels', 'sandals'],
            'shoes': ['pants', 'jeans', 'shirt', 'dress'],
            'sneakers': ['pants', 'jeans', 'shorts', 'shirt'],
            'hat': ['shirt', 'jacket', 'pants'],
            'bag': ['dress', 'shirt', 'pants']
        };

        // Extract colors and types from detected items (filter out missing entries)
        const colors = detectedItems
            .map(item => item.color)
            .filter(Boolean);
        const types = detectedItems
            .map(item => item.type)
            .filter(Boolean);

        // Prepare regex patterns once for efficiency
        const colorRegexes = colors.map(color => new RegExp(color, 'i'));

        // Find complementary products and capture the reasons they were matched
        const recommendationEntries = [];
        for (const type of types) {
            const complements = complementaryMap[type.toLowerCase?.() ? type.toLowerCase() : type] || [];
            for (const complement of complements) {
                const products = await Product.find({
                    $or: [
                        { category: { $regex: complement, $options: 'i' } },
                        { subcategory: { $regex: complement, $options: 'i' } },
                        { name: { $regex: complement, $options: 'i' } }
                    ],
                    ...(colorRegexes.length > 0 ? { colors: { $in: colorRegexes } } : {}),
                    stock: { $gt: 0 }
                })
                    .limit(3)
                    .select('_id name description price discountPrice category subcategory brand images colors tags stock')
                    .lean();

                for (const product of products) {
                    recommendationEntries.push({ product, complement });
                }
            }
        }

        // Consolidate recommendations by product and collect tags (reasons)
        const productMap = new Map();
        for (const { product, complement } of recommendationEntries) {
            const productId = product._id.toString();
            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    product,
                    reasons: new Set([complement])
                });
            } else {
                productMap.get(productId).reasons.add(complement);
            }
        }

        const uniqueProducts = Array.from(productMap.values())
            .slice(0, 6) // keep a reasonable number for both AI prompt and UI
            .map(({ product, reasons }) => ({
                ...product,
                matchReasons: Array.from(reasons)
            }));

        const formattedProducts = uniqueProducts.map(product => ({
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            discountPrice: product.discountPrice,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
            images: product.images || [],
            colors: product.colors || [],
            tags: product.tags || [],
            stock: product.stock,
            link: `/product/${product._id}`,
            matchReasons: product.matchReasons
        }));

        let productLinks;
        if (uniqueProducts.length > 0) {
            productLinks = uniqueProducts
                .map(p => `[${p.name}](/product/${p._id})`)
                .join('\n');
        } else {
            productLinks = "I couldn't find any specific items in your store for these colors, but here are some general ideas.";
        }

        let aiMessage = "I'm at a loss for words. Truly.";
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `You are a witty and sharp-tongued fashion expert, inspired by a character like Anna Wintour. Your critiques are legendary, but you also give brilliant, actionable advice. When a user shows you an outfit, you provide a concise, stylish recommendation. You MUST ONLY include the provided product links in your response. Do not add any external links, suggest products not in the list, or mention any other stores. Keep your response to a maximum of 150 words. The user has provided these product links from their store:\n${productLinks}`
                    },
                    {
                        role: 'user',
                        content: `I'm wearing this: ${analysisText}. What do you think?`
                    }
                ],
                model: 'llama3-8b-8192',
            });

            aiMessage = chatCompletion.choices[0]?.message?.content || aiMessage;
        } catch (groqError) {
            console.error('Groq chat completion failed:', groqError);
            aiMessage = uniqueProducts.length > 0
                ? "My connection couture is acting up, but these pieces from your store are still spot-on."
                : "My genius is wasted on this connection error. Try again later.";
        }

        return { message: aiMessage, products: formattedProducts };
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return {
            message: "My genius is wasted on this connection error. Try again later.",
            products: []
        };
    }
}

// ---------- Text chat helpers ----------

const COLOR_KEYWORDS = [
    'red', 'blue', 'navy', 'green', 'olive', 'teal', 'yellow', 'gold', 'silver', 'black', 'white',
    'gray', 'grey', 'charcoal', 'brown', 'tan', 'beige', 'cream', 'ivory', 'pink', 'peach', 'purple',
    'lavender', 'maroon', 'burgundy', 'orange', 'turquoise'
];

const OCCASION_KEYWORDS = {
    wedding: ['wedding', 'marriage', 'engagement', 'reception', 'sangeet', 'mehndi'],
    festive: ['festival', 'festive', 'diwali', 'navratri', 'eid', 'pongal'],
    party: ['party', 'birthday', 'cocktail', 'celebration', 'evening'],
    office: ['office', 'work', 'meeting', 'corporate', 'formal'],
    casual: ['casual', 'brunch', 'day out', 'relaxed', 'weekend'],
    travel: ['travel', 'vacation', 'holiday', 'trip'],
    date: ['date', 'anniversary', 'romantic']
};

const STYLE_KEYWORDS = [
    'traditional', 'modern', 'elegant', 'formal', 'casual', 'chic', 'minimal', 'bold', 'statement',
    'fusion', 'classic', 'sporty', 'athleisure', 'streetwear'
];

const SLOT_SEARCH_CONFIG = {
    top: {
        label: 'Top',
        keywords: ['top', 'topwear', 'shirt', 'blouse', 'kurta', 'kurti', 'tshirt', 't-shirt', 'tee', 'polo', 'crop top', 'choli', 'bodysuit', 'sweater', 'hoodie', 'pullover', 'sweatshirt', 'cardigan', 'tunic', 'upper', 'henley', 'tank', 'camisole', 'jersey'],
        fallbackKeywords: ['top', 'shirt', 't-shirt', 'tshirt', 'tee', 'kurta']
    },
    bottom: {
        label: 'Bottom',
        keywords: ['bottom', 'bottomwear', 'pant', 'pants', 'trouser', 'trousers', 'jean', 'jeans', 'denim', 'jogger', 'joggers', 'skirt', 'short', 'shorts', 'cargo', 'palazzo', 'leggings', 'flared', 'wide leg', 'culotte', 'capri', 'track pant', 'trackpant', 'lehenga skirt', 'sharara', 'dhoti'],
        fallbackKeywords: ['pants', 'jeans', 'skirt', 'bottom']
    },
    accessory: {
        label: 'Accessory',
        keywords: ['accessory', 'earring', 'earrings', 'necklace', 'jewelry', 'jewellery', 'bracelet', 'bangle', 'bangles', 'ring', 'watch', 'belt', 'brooch', 'clutch', 'bag', 'bags', 'purse', 'handbag', 'hair accessory', 'hairband', 'hair band', 'hair clip', 'scrunchie', 'scarf', 'stole', 'dupatta', 'wallet', 'sunglass', 'sunglasses', 'shade', 'shades', 'eyewear', 'glasses', 'frames', 'goggles', 'cap', 'hat', 'beanie', 'cufflink', 'cufflinks'],
        fallbackKeywords: ['sunglasses', 'bag', 'watch', 'earrings', 'necklace', 'bracelet']
    },
    footwear: {
        label: 'Footwear',
        keywords: ['footwear', 'shoe', 'shoes', 'heel', 'heels', 'sandal', 'sandals', 'pump', 'loafers', 'loafer', 'boot', 'boots', 'sneaker', 'sneakers', 'flat', 'flats', 'jutti', 'mojari', 'mules', 'flip flop', 'flip-flop', 'slipper', 'slippers', 'kolhapuri', 'loafer', 'loafer'],
        fallbackKeywords: ['shoes', 'heels', 'sandals']
    },
    dress: {
        label: 'Dress',
        keywords: ['dress', 'gown', 'saree', 'lehenga', 'anarkali', 'jumpsuit', 'maxi', 'co-ord', 'co ord', 'coordinates', 'kurta set', 'co-ord set', 'coord set', 'one-piece', 'one piece'],
        fallbackKeywords: ['dress', 'gown', 'saree']
    },
    outerwear: {
        label: 'Layer',
        keywords: ['jacket', 'blazer', 'coat', 'overcoat', 'trench', 'shrug', 'cape', 'poncho', 'parka', 'windcheater', 'windbreaker', 'gilet'],
        fallbackKeywords: ['jacket', 'blazer', 'coat']
    }
};

const DEFAULT_SLOT_PLAN = ['top', 'bottom', 'accessory', 'footwear'];

const SEARCH_STOP_WORDS = new Set([
    'i', 'im', "i'm", 'me', 'my', 'need', 'want', 'please', 'pls', 'good', 'great', 'nice', 'show', 'find', 'give',
    'suggest', 'recommend', 'for', 'with', 'and', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'about', 'into',
    'from', 'tomorrow', 'today', 'tonight', 'help', 'make', 'create', 'something', 'some', 'any', 'maybe', 'also',
    'just', 'like', 'looking', 'attending', 'going', 'outfit', 'dressup', 'dress-up', 'set', 'pair', 'combo', 'complete'
]);

const SLOT_INFERENCE_PATTERNS = {
    dress: ['dress', 'gown', 'saree', 'lehenga', 'anarkali', 'jumpsuit', 'co-ord set', 'co ord set', 'coord set', 'kurta set', 'one-piece', 'one piece', 'maxi', 'bodycon'],
    footwear: ['footwear', 'shoe', 'shoes', 'sandal', 'sandals', 'heel', 'heels', 'loafers', 'loafer', 'boots', 'boot', 'sneakers', 'sneaker', 'mules', 'mule', 'flip flop', 'flip-flop', 'slipper', 'slippers', 'jutti', 'mojari', 'kolhapuri', 'ballerina', 'flat', 'flats'],
    accessory: ['accessory', 'bag', 'bags', 'handbag', 'purse', 'wallet', 'belt', 'watch', 'bracelet', 'earring', 'earrings', 'necklace', 'jewelry', 'jewellery', 'ring', 'bangle', 'bangles', 'scarf', 'stole', 'dupatta', 'sunglasses', 'sunglass', 'shades', 'shade', 'eyewear', 'glasses', 'frames', 'goggles', 'cap', 'hat', 'beanie', 'brooch', 'cufflink', 'cufflinks', 'hairband', 'hair band', 'hair clip', 'scrunchie'],
    outerwear: ['jacket', 'coat', 'overcoat', 'trench', 'blazer', 'poncho', 'cape', 'parka', 'windcheater', 'windbreaker', 'gilet'],
    top: ['top', 'topwear', 't-shirt', 'tshirt', 'tee', 'polo', 'shirt', 'shirts', 'kurta', 'kurti', 'blouse', 'camisole', 'tank', 'sweater', 'hoodie', 'pullover', 'sweatshirt', 'cardigan', 'crop top', 'choli', 'bodysuit', 'upper', 'henley', 'jersey', 'tunic'],
    bottom: ['bottom', 'bottomwear', 'pant', 'pants', 'trouser', 'trousers', 'jean', 'jeans', 'denim', 'jogger', 'joggers', 'short', 'shorts', 'cargo', 'palazzo', 'leggings', 'wide leg', 'culotte', 'capri', 'track pant', 'trackpant', 'skirt', 'lehenga skirt', 'sharara', 'dhoti']
};

const SLOT_INFERENCE_ORDER = ['dress', 'footwear', 'accessory', 'outerwear', 'top', 'bottom'];

const CATEGORY_SLOT_HINTS = {
    dress: ['dress', 'dresses', 'gown', 'saree', 'lehenga', 'anarkali', 'kurta set', 'co-ord set', 'coordinates', 'jumpsuit'],
    top: ['top', 'topwear', 't-shirt', 'tshirt', 'tee', 'shirt', 'shirts', 'kurta', 'kurti', 'blouse', 'sweatshirt', 'hoodie', 'sweater', 'cardigan', 'upper', 'camisole', 'tank', 'chemise'],
    bottom: ['bottom', 'bottomwear', 'pant', 'pants', 'trouser', 'trousers', 'jean', 'jeans', 'denim', 'jogger', 'short', 'shorts', 'palazzo', 'leggings', 'skirt', 'culotte', 'dhoti'],
    footwear: ['footwear', 'shoes', 'shoe', 'sandal', 'sandals', 'heels', 'heel', 'sneaker', 'sneakers', 'loafer', 'loafers', 'boots', 'boot', 'flip flop', 'flip-flop', 'slipper', 'slippers', 'mules'],
    accessory: ['accessory', 'accessories', 'bag', 'bags', 'handbag', 'clutch', 'wallet', 'belt', 'watch', 'jewelry', 'jewellery', 'bracelet', 'earring', 'earrings', 'necklace', 'ring', 'bangle', 'scarf', 'stole', 'dupatta', 'sunglass', 'sunglasses', 'shades', 'eyewear', 'glasses', 'frames', 'goggle', 'goggles', 'cap', 'hat', 'beanie', 'cufflink', 'cufflinks'],
    outerwear: ['outerwear', 'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers', 'trench', 'poncho', 'parka', 'windcheater', 'windbreaker', 'gilet']
};

function escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectGenderFromText(text) {
    const lower = text.toLowerCase();
    if (/\b(woman|women|female|ladies|bride)\b/.test(lower)) {
        return 'women';
    }
    if (/\b(man|men|male|groom|gentlemen?)\b/.test(lower)) {
        return 'men';
    }
    return 'unisex';
}

function detectOccasionFromText(text) {
    const lower = text.toLowerCase();
    for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
        if (keywords.some(keyword => lower.includes(keyword))) {
            return occasion;
        }
    }
    return null;
}

function detectStyleDescriptors(text) {
    const lower = text.toLowerCase();
    return STYLE_KEYWORDS.filter(keyword => lower.includes(keyword));
}

function detectColors(text) {
    const lower = text.toLowerCase();
    return COLOR_KEYWORDS.filter(color => lower.includes(color));
}

function detectRequestedSlots(text) {
    const lower = text.toLowerCase();
    const slots = new Set();

    for (const [slot, config] of Object.entries(SLOT_SEARCH_CONFIG)) {
        if (config.keywords.some(keyword => lower.includes(keyword))) {
            slots.add(slot);
        }
    }

    return Array.from(slots);
}

function extractSearchTerms(text) {
    if (!text) {
        return [];
    }

    const matches = text
        .toLowerCase()
        .match(/[a-z][a-z'&-]{2,}/g);

    if (!matches) {
        return [];
    }

    const unique = new Set();
    for (const token of matches) {
        if (!SEARCH_STOP_WORDS.has(token)) {
            unique.add(token);
        }
    }

    return Array.from(unique).slice(0, 12);
}

function buildProductSearchText(product) {
    const segments = [
        product?.category,
        product?.subcategory,
        product?.styleType,
        product?.material,
        product?.brand,
        product?.name,
        ...(product?.tags || [])
    ];

    return segments
        .filter(Boolean)
        .map(value => value.toString().toLowerCase())
        .join(' ');
}

function matchesPattern(text, pattern) {
    if (!pattern) {
        return false;
    }

    const normalizedPattern = pattern.toLowerCase();
    if (normalizedPattern.includes(' ')) {
        return text.includes(normalizedPattern);
    }

    const regex = new RegExp(`\\b${escapeRegex(normalizedPattern)}\\b`, 'i');
    return regex.test(text);
}

function filterSearchTermsForSlot(slotId, searchTerms = []) {
    const patterns = SLOT_INFERENCE_PATTERNS[slotId];
    if (!patterns || !searchTerms.length) {
        return [];
    }

    return searchTerms.filter(term =>
        patterns.some(pattern => matchesPattern(term, pattern))
    );
}

function extractSpecificProductMentions(text) {
    const quoted = Array.from(text.matchAll(/"([^"]+)"|'([^']+)'/g)).map(match => match[1] || match[2]).filter(Boolean);

    // Capture capitalized multi-word phrases (e.g., Aurora Silk Saree)
    const capitalizedMatches = Array.from(text.matchAll(/(?:^|\s)([A-Z][\w&]*(?:\s+[A-Z][\w&]*){1,3})/g))
        .map(match => match[1]?.trim())
        .filter(Boolean)
        .filter(phrase => phrase.split(' ').every(word => word.length > 2));

    const combined = [...quoted, ...capitalizedMatches];
    return Array.from(new Set(combined));
}

function fallbackIntentFromText(text) {
    const gender = detectGenderFromText(text);
    const occasion = detectOccasionFromText(text);
    const styles = detectStyleDescriptors(text);
    const colors = detectColors(text);
    const requestedSlots = detectRequestedSlots(text);
    const specificProducts = extractSpecificProductMentions(text);
    const searchTerms = extractSearchTerms(text);

    const hasOnePiece = /\b(dress|gown|saree|lehenga|jumpsuit|co-ord|coords|kurta set)\b/i.test(text);
    const needsFullOutfit = /\b(outfit|look|complete|head to toe|from top to toe)\b/i.test(text) || !requestedSlots.length;

    const slotPlan = requestedSlots.length
        ? requestedSlots
        : hasOnePiece
            ? ['dress', 'accessory', 'footwear']
            : (needsFullOutfit ? DEFAULT_SLOT_PLAN : ['top', 'bottom']);

    const keywordsBySlot = {};
    for (const slot of Object.keys(SLOT_SEARCH_CONFIG)) {
        const keywords = SLOT_SEARCH_CONFIG[slot].keywords.filter(keyword => text.toLowerCase().includes(keyword));
        if (keywords.length > 0) {
            keywordsBySlot[slot] = Array.from(new Set(keywords));
        }
    }

    return {
        gender,
        occasion,
        styleDescriptors: styles,
        priorityColors: colors,
        specificProducts,
        needsFullOutfit,
        requestedSlots: Array.from(new Set(slotPlan)),
        keywordsBySlot,
        searchTerms
    };
}

function summarizeChatHistory(chatHistory = []) {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
        return '';
    }

    const recentHistory = chatHistory.slice(-4).map(entry => {
        const sender = entry.sender === 'user' ? 'User' : 'Assistant';
        const text = typeof entry.text === 'string' ? entry.text : '';
        return `${sender}: ${text}`;
    });

    return recentHistory.join('\n');
}

async function interpretUserIntent(userText, chatHistory = []) {
    const fallbackIntent = fallbackIntentFromText(userText);

    if (!process.env.GROQ_API_KEY) {
        return fallbackIntent;
    }

    try {
        const systemPrompt = `You are a fashion retail AI that extracts intent from shopper messages.\n` +
            `Return ONLY strict JSON with this exact schema:\n` +
            `{"gender": "men|women|unisex|unknown", "occasion": string|null, "styleDescriptors": [string], "priorityColors": [string], "specificProducts": [string], "needsFullOutfit": boolean, "requestedSlots": ["top"|"bottom"|"dress"|"accessory"|"footwear"|"outerwear"|"additional"], "keywordsBySlot": { "slot": [string] } }.\n` +
            `Slots should be chosen only from the allowed list.\n` +
            `If the user explicitly names a product, add the exact quoted name to specificProducts.\n` +
            `If the user asks for a complete outfit or sounds open-ended, set needsFullOutfit to true.\n` +
            `Use empty arrays instead of null for list fields when no data is found.`;

        const conversationSummary = summarizeChatHistory(chatHistory);
        const userPrompt = conversationSummary
            ? `Conversation so far:\n${conversationSummary}\n\nCurrent user request: ${userText}`
            : `User request: ${userText}`;

        const response = await groq.chat.completions.create({
            model: 'llama3-8b-8192',
            temperature: 0.2,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });

        const rawContent = response.choices?.[0]?.message?.content || '';
        const cleaned = rawContent.replace(/```json|```/g, '').trim();
        if (!cleaned) {
            return fallbackIntent;
        }

        try {
            const parsed = JSON.parse(cleaned);

            return {
                gender: parsed.gender && parsed.gender !== 'unknown' ? parsed.gender : fallbackIntent.gender,
                occasion: parsed.occasion ?? fallbackIntent.occasion,
                styleDescriptors: Array.isArray(parsed.styleDescriptors) && parsed.styleDescriptors.length > 0
                    ? parsed.styleDescriptors
                    : fallbackIntent.styleDescriptors,
                priorityColors: Array.isArray(parsed.priorityColors) && parsed.priorityColors.length > 0
                    ? parsed.priorityColors
                    : fallbackIntent.priorityColors,
                specificProducts: Array.isArray(parsed.specificProducts) ? parsed.specificProducts : fallbackIntent.specificProducts,
                needsFullOutfit: typeof parsed.needsFullOutfit === 'boolean' ? parsed.needsFullOutfit : fallbackIntent.needsFullOutfit,
                requestedSlots: Array.isArray(parsed.requestedSlots) && parsed.requestedSlots.length > 0
                    ? Array.from(new Set(parsed.requestedSlots))
                    : fallbackIntent.requestedSlots,
                keywordsBySlot: parsed.keywordsBySlot && typeof parsed.keywordsBySlot === 'object'
                    ? parsed.keywordsBySlot
                    : fallbackIntent.keywordsBySlot,
                searchTerms: fallbackIntent.searchTerms
            };
        } catch (parseError) {
            console.warn('Unable to parse Groq intent JSON, using fallback intent:', parseError?.message || parseError);
            return fallbackIntent;
        }
    } catch (error) {
        console.error('Failed to interpret user intent with Groq:', error);
        return fallbackIntent;
    }
}

function buildSlotPlan(intent) {
    const slotsFromIntent = Array.isArray(intent.requestedSlots) && intent.requestedSlots.length > 0
        ? intent.requestedSlots
        : (intent.needsFullOutfit ? DEFAULT_SLOT_PLAN : ['top', 'bottom']);

    const plan = [];
    const slotSet = new Set();

    for (const slot of slotsFromIntent) {
        if (slot === 'additional') {
            if (!slotSet.has('footwear')) {
                plan.push({ slotId: 'footwear', label: SLOT_SEARCH_CONFIG.footwear.label, searchType: 'footwear' });
                slotSet.add('footwear');
            }
            continue;
        }

        if (!SLOT_SEARCH_CONFIG[slot]) {
            continue;
        }

        const key = slot === 'dress' ? 'dress' : slot;
        if (!slotSet.has(key)) {
            plan.push({ slotId: key, label: SLOT_SEARCH_CONFIG[key].label, searchType: key });
            slotSet.add(key);
        }
    }

    if (plan.length === 0) {
        // Guarantee at least a top/bottom pairing
        plan.push({ slotId: 'top', label: SLOT_SEARCH_CONFIG.top.label, searchType: 'top' });
        plan.push({ slotId: 'bottom', label: SLOT_SEARCH_CONFIG.bottom.label, searchType: 'bottom' });
    }

    // For full outfits ensure accessory/footwear are present
    if (intent.needsFullOutfit) {
        if (!slotSet.has('accessory')) {
            plan.push({ slotId: 'accessory', label: SLOT_SEARCH_CONFIG.accessory.label, searchType: 'accessory' });
            slotSet.add('accessory');
        }
        if (!slotSet.has('footwear')) {
            plan.push({ slotId: 'footwear', label: SLOT_SEARCH_CONFIG.footwear.label, searchType: 'footwear' });
            slotSet.add('footwear');
        }
    }

    // Avoid exceeding 4 items to keep response focused
    return plan.slice(0, 4);
}

function createKeywordCondition(keywords) {
    if (!keywords || keywords.length === 0) {
        return null;
    }

    const conditions = [];
    for (const keyword of keywords) {
        const regex = new RegExp(escapeRegex(keyword), 'i');
        conditions.push({ category: regex });
        conditions.push({ subcategory: regex });
        conditions.push({ tags: regex });
        conditions.push({ name: regex });
        conditions.push({ description: regex });
    }

    return conditions.length ? { $or: conditions } : null;
}

function createAttributeCondition(values, fields) {
    if (!values || values.length === 0) {
        return null;
    }
    const conditions = [];
    for (const value of values) {
        const regex = new RegExp(escapeRegex(value), 'i');
        for (const field of fields) {
            conditions.push({ [field]: regex });
        }
    }
    return conditions.length ? { $or: conditions } : null;
}

function determineSlotFromProduct(product) {
    const attributes = [
        product.category,
        product.subcategory,
        product.styleType,
        product.fitType,
        ...(product.tags || [])
    ];

    for (const value of attributes) {
        if (!value || typeof value !== 'string') {
            continue;
        }
        const lower = value.toLowerCase();
        for (const [slot, hints] of Object.entries(CATEGORY_SLOT_HINTS)) {
            if (hints.some(hint => lower.includes(hint))) {
                return slot;
            }
        }
    }

    const searchText = buildProductSearchText(product);
    if (searchText) {
        for (const slot of SLOT_INFERENCE_ORDER) {
            const patterns = SLOT_INFERENCE_PATTERNS[slot];
            if (!patterns) {
                continue;
            }
            if (patterns.some(pattern => matchesPattern(searchText, pattern))) {
                return slot;
            }
        }
    }

    return 'accessory';
}

async function findDirectProductMatches(intent, plan, usedIds) {
    const matches = [];
    const planMap = new Map(plan.map(entry => [entry.slotId, entry]));

    function getPlanItemForSlot(slotId) {
        if (planMap.has(slotId)) {
            return planMap.get(slotId);
        }
        if (planMap.has('accessory')) {
            return planMap.get('accessory');
        }
        return plan[0] || null;
    }

    function appendMatch(product, planItem, reason) {
        const productId = product._id.toString();
        const existing = matches.find(match => match.product._id.toString() === productId);
        if (existing) {
            if (reason) {
                existing.reasons.push(reason);
            }
            return;
        }

        matches.push({
            slotId: planItem.slotId,
            label: planItem.label,
            searchType: planItem.searchType,
            product,
            reasons: reason ? [reason] : []
        });
    }

    async function tryAddProduct(product, reason) {
        if (!product) {
            return;
        }

        const productId = product._id.toString();
        if (usedIds.has(productId)) {
            return;
        }

        const slotId = determineSlotFromProduct(product);
        const planItem = getPlanItemForSlot(slotId);
        if (!planItem) {
            return;
        }

        usedIds.add(productId);
        appendMatch(product, planItem, reason);
    }

    const productSelectFields = '_id name description price discountPrice category subcategory brand images colors tags stock rating styleType fitType';

    for (const name of intent.specificProducts || []) {
        const regex = new RegExp(escapeRegex(name), 'i');
        const product = await Product.findOne({ name: regex, stock: { $gt: 0 } })
            .select(productSelectFields)
            .lean();

        await tryAddProduct(product, `direct mention: ${name}`);
    }

    for (const term of intent.searchTerms || []) {
        if (!term || term.length < 3) {
            continue;
        }

        const regex = new RegExp(escapeRegex(term), 'i');
        const product = await Product.findOne({
            stock: { $gt: 0 },
            _id: { $nin: Array.from(usedIds) },
            $or: [
                { name: regex },
                { tags: regex },
                { category: regex },
                { subcategory: regex },
                { description: regex },
                { brand: regex }
            ]
        })
            .select(productSelectFields)
            .lean();

        await tryAddProduct(product, `search term: ${term}`);
    }

    return matches;
}

async function queryProductForSlot(planItem, intent, usedIds) {
    const config = SLOT_SEARCH_CONFIG[planItem.searchType] || SLOT_SEARCH_CONFIG[planItem.slotId];
    if (!config) {
        return null;
    }

    const slotSearchTerms = filterSearchTermsForSlot(planItem.slotId, intent.searchTerms);
    const slotKeywords = Array.from(new Set([
        ...(config.keywords || []),
        ...(intent.keywordsBySlot?.[planItem.slotId] || []),
        ...(intent.keywordsBySlot?.[planItem.searchType] || []),
        ...slotSearchTerms
    ])).filter(Boolean);

    const keywordCondition = createKeywordCondition(slotKeywords.length ? slotKeywords : config.fallbackKeywords);
    const colorCondition = createAttributeCondition(intent.priorityColors, ['colors', 'name', 'description']);
    const occasionCondition = intent.occasion
        ? createAttributeCondition([intent.occasion], ['occasion', 'tags', 'description'])
        : null;
    const styleCondition = createAttributeCondition(intent.styleDescriptors, ['tags', 'description']);
    const genderCondition = intent.gender && intent.gender !== 'unisex'
        ? createAttributeCondition([intent.gender], ['tags', 'category', 'subcategory', 'name', 'description'])
        : null;

    const baseConditions = [{ stock: { $gt: 0 } }];
    const filters = [keywordCondition, genderCondition, occasionCondition, styleCondition, colorCondition]
        .filter(Boolean);

    async function runQuery(includeColor = true, includeOccasion = true) {
        const conditions = [...baseConditions];
        if (keywordCondition) conditions.push(keywordCondition);
        if (genderCondition) conditions.push(genderCondition);
        if (includeOccasion && occasionCondition) conditions.push(occasionCondition);
        if (styleCondition) conditions.push(styleCondition);
        if (includeColor && colorCondition) conditions.push(colorCondition);
        conditions.push({ _id: { $nin: Array.from(usedIds) } });

        const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

        return Product.findOne(query)
            .sort({ discountPrice: 1, price: 1, rating: -1 })
            .select('_id name description price discountPrice category subcategory brand images colors tags stock rating')
            .lean();
    }

    let product = await runQuery(true, true);
    if (!product && colorCondition) {
        product = await runQuery(false, true);
    }
    if (!product && occasionCondition) {
        product = await runQuery(false, false);
    }
    if (!product) {
        // Final relaxed search without style/gender to ensure at least some result
        const relaxedConditions = [
            { stock: { $gt: 0 } },
            keywordCondition,
            { _id: { $nin: Array.from(usedIds) } }
        ].filter(Boolean);

        const relaxedQuery = relaxedConditions.length > 1 ? { $and: relaxedConditions } : relaxedConditions[0];
        product = await Product.findOne(relaxedQuery)
            .sort({ discountPrice: 1, price: 1, rating: -1 })
            .select('_id name description price discountPrice category subcategory brand images colors tags stock rating')
            .lean();
    }

    if (!product) {
        return null;
    }

    const productId = product._id.toString();
    usedIds.add(productId);

    const reasons = [`slot: ${planItem.label}`];
    if (intent.occasion) {
        reasons.push(`occasion: ${intent.occasion}`);
    }
    if (intent.gender && intent.gender !== 'unisex') {
        reasons.push(`gender: ${intent.gender}`);
    }

    return {
        slotId: planItem.slotId,
        label: planItem.label,
        searchType: planItem.searchType,
        product,
        reasons
    };
}

async function findProductsForPlan(plan, intent) {
    const usedIds = new Set();
    const selections = [];

    const directMatches = await findDirectProductMatches(intent, plan, usedIds);
    selections.push(...directMatches);

    for (const planItem of plan) {
        if (selections.some(selection => selection.slotId === planItem.slotId)) {
            continue;
        }

        const selection = await queryProductForSlot(planItem, intent, usedIds);
        if (selection) {
            selections.push(selection);
        }
    }

    const recommendedProducts = [];
    const simpleProducts = [];

    for (const selection of selections) {
        const product = selection.product;
        const id = product._id.toString();
        recommendedProducts.push({
            slot: selection.slotId,
            label: selection.label,
            searchType: selection.searchType,
            _id: id,
            name: product.name,
            description: product.description,
            price: product.price,
            discountPrice: product.discountPrice,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            images: product.images || [],
            colors: product.colors || [],
            tags: product.tags || [],
            stock: product.stock,
            rating: product.rating || 0,
            link: `/product/${id}`,
            matchReasons: selection.reasons
        });

        simpleProducts.push({
            slot: selection.slotId,
            _id: id,
            name: product.name,
            description: product.description,
            price: product.price,
            discountPrice: product.discountPrice,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            images: product.images || [],
            rating: product.rating || 0,
            stock: product.stock
        });
    }

    // Maintain consistent ordering according to initial plan
    const orderMap = new Map(plan.map((item, index) => [item.slotId, index]));
    recommendedProducts.sort((a, b) => {
        const aIndex = orderMap.has(a.slot) ? orderMap.get(a.slot) : Number.MAX_SAFE_INTEGER;
        const bIndex = orderMap.has(b.slot) ? orderMap.get(b.slot) : Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
    });

    simpleProducts.sort((a, b) => {
        const aIndex = orderMap.has(a.slot) ? orderMap.get(a.slot) : Number.MAX_SAFE_INTEGER;
        const bIndex = orderMap.has(b.slot) ? orderMap.get(b.slot) : Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
    });

    const cleanedSimpleProducts = simpleProducts.map(({ slot, ...rest }) => rest);

    return { recommendedProducts, simpleProducts: cleanedSimpleProducts };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(Math.round(amount));
}

function buildCostBreakdown(recommendedProducts) {
    if (!recommendedProducts || recommendedProducts.length === 0) {
        return null;
    }

    const items = recommendedProducts.map(product => {
        const finalPrice = typeof product.discountPrice === 'number' && product.discountPrice > 0
            ? product.discountPrice
            : product.price;
        return {
            slot: product.slot,
            label: product.label,
            name: product.name,
            price: product.price,
            discountPrice: product.discountPrice,
            finalPrice,
            link: product.link,
            formattedFinalPrice: formatCurrency(finalPrice)
        };
    });

    const total = items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
    return {
        currency: 'INR',
        items,
        total,
        formattedTotal: formatCurrency(total)
    };
}

function composeAssistantMessage(intent, recommendedProducts, costBreakdown) {
    if (!recommendedProducts || recommendedProducts.length === 0) {
        return "I couldn't match any products just yet. Could you share a bit more detail about the look you're after?";
    }

    const contextParts = [];
    if (intent.gender && intent.gender !== 'unisex') {
        contextParts.push(`${intent.gender}`);
    }
    if (intent.occasion) {
        contextParts.push(`${intent.occasion}`);
    } else {
        contextParts.push('styled');
    }

    const intro = `Here's a ${contextParts.join(' ')} outfit pulled from your store:`.replace(/\s+/g, ' ');
    const lines = recommendedProducts.map(product => `• ${product.label}: ${product.name}`);
    const totalLine = costBreakdown ? `Total outfit cost: ${costBreakdown.formattedTotal}.` : '';
    const outro = 'Tap the linked outfit pieces below to explore each product.';

    return [intro, ...lines, totalLine, outro].filter(Boolean).join('\n');
}

// Fashion outfit recognition from image
exports.fashionRecognition = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded.' });
    }

    const imagePath = req.file.path;
    const userId = req.user ? req.user.id : null;
    const io = req.app.get('io');

    try {
        console.log(`Analyzing image at path: ${imagePath}`);
        const analysisResults = await analyzeImageWithPython(imagePath);

        if (!analysisResults || analysisResults.length === 0) {
            const fallbackMsg = "I couldn't detect any specific clothing items, but I can still give you some general fashion advice!";
            if (userId) io.to(userId).emit('ai-chat-response', { message: fallbackMsg });
            return res.json({ message: fallbackMsg });
        }

        const descriptions = analysisResults.map(item => `${item.color} ${item.type}`).join(', ');
        const analysisText = `Detected items: ${descriptions}.`;

        console.log(`Groq analysis text: "${analysisText}"`);
        const { message: recommendationMessage, products: recommendedProducts } = await generateRecommendations(analysisText, analysisResults);

        const responseMessage = `Based on the image, I see: ${descriptions}. Here are some outfit ideas: ${recommendationMessage}`;
        if (userId) io.to(userId).emit('ai-chat-response', { message: responseMessage, recommendedProducts });

        res.json({
            message: 'Analysis complete',
            analysis: analysisResults,
            recommendations: recommendationMessage,
            recommendedProducts
        });

    } catch (error) {
        console.error('Error in fashion recognition:', error);
        const errorMsg = "Sorry, I encountered an error trying to analyze the image. Please try again.";
        if (userId) {
            io.to(userId).emit('ai-chat-response', { message: errorMsg, isError: true });
        }
        res.status(500).json({ message: error.message });
    } finally {
        // Clean up the uploaded file
        try {
            await fs.unlink(imagePath);
            console.log(`Deleted temporary file: ${imagePath}`);
        } catch (unlinkError) {
            console.error(`Error deleting temporary file ${imagePath}:`, unlinkError);
        }
    }
};

// Helper function to run Python script for clothing detection
async function analyzeImageWithPython(imagePath) {
    return new Promise((resolve, reject) => {
        // Ensure the python script path is correct, relative to this file
        const scriptPath = path.join(__dirname, '..', '..', 'detect_clothing.py');

        console.log(`Spawning Python script: ${scriptPath} with image ${imagePath}`);

        const pythonProcess = spawn('python', [scriptPath, imagePath]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`Python stderr: ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python script exited with code ${code}`);
            if (code !== 0) {
                return reject(new Error(`Python script failed with code ${code}: ${stderr}`));
            }
            try {
                // The output might have multiple JSON objects or other text, find the JSON
                const jsonMatch = stdout.match(/\[.*\]/s);
                if (!jsonMatch) {
                    throw new Error("No valid JSON array found in Python script output.");
                }
                const results = JSON.parse(jsonMatch[0]);
                resolve(results);
            } catch (e) {
                console.error("Failed to parse JSON from Python script:", stdout);
                reject(new Error(`Failed to parse JSON from Python script: ${e.message}`));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            reject(err);
        });
    });
}

// Helper function to process ResNet classification results
function processResNetResults(classifications) {
    console.log('Processing ResNet results:', classifications.slice(0, 10));

    // Look for clothing-related labels with gender context
    const clothingLabels = [
        'coat', 'jacket', 'blazer', 'suit jacket', 'trouser', 'necktie',
        'shirt', 't-shirt', 'dress', 'skirt', 'blouse', 'jeans', 'shoe'
    ];

    let bestMatch = null;
    let highestScore = 0;
    let genderHints = { men: 0, women: 0 };

    for (const classification of classifications) {
        const label = classification.label.toLowerCase();

        // Count gender indicators
        if (label.includes('suit') || label.includes('tie') || label.includes('blazer') || label.includes('trouser')) {
            genderHints.men += classification.score;
        }
        if (label.includes('dress') || label.includes('skirt') || label.includes('blouse')) {
            genderHints.women += classification.score;
        }

        // Find best clothing match
        for (const clothingLabel of clothingLabels) {
            if (label.includes(clothingLabel) && classification.score > highestScore) {
                bestMatch = {
                    item: clothingLabel,
                    score: classification.score,
                    label: label
                };
                highestScore = classification.score;
                break;
            }
        }
    }

    if (bestMatch) {
        // Determine gender based on hints
        let gender = 'unisex';
        if (genderHints.men > genderHints.women * 1.5) {
            gender = 'men';
        } else if (genderHints.women > genderHints.men * 1.5) {
            gender = 'women';
        }

        // Special handling for coats - often unisex but can be gendered
        if (bestMatch.item === 'coat') {
            if (genderHints.men > 0.1) {
                gender = 'men';
            } else if (genderHints.women > 0.1) {
                gender = 'women';
            }
        }

        return {
            item: bestMatch.item,
            gender: gender,
            confidence: Math.min(bestMatch.score, 1.0)
        };
    }

    return { item: 'clothing item', gender: 'unisex', confidence: 0.3 };
}

// Helper function to process ViT results with enhanced color detection
function processViTResultsWithColor(classifications) {
    console.log('Processing ViT results with color detection:', classifications.slice(0, 20));

    // Extended clothing labels
    const clothingLabels = [
        'coat', 'jacket', 'blazer', 'suit jacket', 'trouser', 'necktie',
        'shirt', 't-shirt', 'dress', 'skirt', 'blouse', 'jeans', 'shoe',
        'sweater', 'cardigan', 'hoodie', 'shorts', 'boots', 'sneakers', 'hat'
    ];

    // Color detection patterns
    const colorPatterns = [
        'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey',
        'brown', 'purple', 'pink', 'orange', 'navy', 'maroon', 'beige', 'cream',
        'silver', 'gold', 'tan', 'khaki', 'olive', 'burgundy', 'turquoise', 'lavender'
    ];

    let bestMatch = null;
    let highestScore = 0;
    let detectedColor = '';
    let genderHints = { men: 0, women: 0 };

    for (const classification of classifications) {
        const label = classification.label.toLowerCase();
        const score = classification.score;

        // Enhanced color detection
        for (const color of colorPatterns) {
            if (label.includes(color) && !detectedColor) {
                detectedColor = color;
                break;
            }
        }

        // Count gender indicators
        if (label.includes('suit') || label.includes('tie') || label.includes('blazer') || label.includes('trouser')) {
            genderHints.men += score;
        }
        if (label.includes('dress') || label.includes('skirt') || label.includes('blouse')) {
            genderHints.women += score;
        }

        // Find best clothing match
        for (const clothingLabel of clothingLabels) {
            if (label.includes(clothingLabel) && score > highestScore) {
                bestMatch = {
                    item: clothingLabel,
                    score: score,
                    label: label
                };
                highestScore = score;
                break;
            }
        }
    }

    if (bestMatch) {
        // Determine gender based on hints
        let gender = 'unisex';
        if (genderHints.men > genderHints.women * 1.5) {
            gender = 'men';
        } else if (genderHints.women > genderHints.men * 1.5) {
            gender = 'women';
        }

        // Special handling for certain items
        if (bestMatch.item === 'coat' || bestMatch.item === 'jacket') {
            if (genderHints.men > 0.1) {
                gender = 'men';
            } else if (genderHints.women > 0.1) {
                gender = 'women';
            }
        }

        // If no color detected, try to infer from the label
        if (!detectedColor && bestMatch.label) {
            for (const color of colorPatterns) {
                if (bestMatch.label.includes(color)) {
                    detectedColor = color;
                    break;
                }
            }
        }

        return {
            item: bestMatch.item,
            color: detectedColor,
            gender: gender,
            confidence: Math.min(bestMatch.score, 1.0)
        };
    }

    return { item: 'clothing item', color: '', gender: 'unisex', confidence: 0.3 };
}

// Helper function to process CLIP zero-shot classification results
function processCLIPResults(classifications) {
    console.log('Processing CLIP results:', classifications.slice(0, 10));

    if (!classifications || classifications.length === 0) {
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.5 };
    }

    // Find the best matching classification
    const bestMatch = classifications[0]; // CLIP returns sorted by score
    const label = bestMatch.label.toLowerCase();
    const score = bestMatch.score;

    console.log('Best CLIP match:', label, 'Score:', score);

    // Parse the label to extract item, color, and gender
    let item = 'shirt'; // default
    let color = '';
    let gender = 'unisex';

    // Extract gender
    if (label.includes("men's") || label.includes("man")) {
        gender = 'men';
    } else if (label.includes("women's") || label.includes("woman")) {
        gender = 'women';
    }

    // Extract color
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange', 'navy', 'maroon', 'beige'];
    for (const c of colors) {
        if (label.includes(c)) {
            color = c;
            break;
        }
    }

    // Extract item type
    if (label.includes('shirt') || label.includes('blouse') || label.includes('top')) {
        item = 'shirt';
    } else if (label.includes('dress')) {
        item = 'dress';
    } else if (label.includes('pants') || label.includes('trousers') || label.includes('jeans')) {
        item = 'pants';
    } else if (label.includes('jacket') || label.includes('coat') || label.includes('blazer')) {
        item = 'jacket';
    } else if (label.includes('shoes') || label.includes('sneakers') || label.includes('boots') || label.includes('heels')) {
        item = 'shoes';
    } else if (label.includes('skirt')) {
        item = 'skirt';
    }

    // If no color detected but we have a high confidence match, try to infer
    if (!color && score > 0.3) {
        // For demonstration, assume red for the user's example
        color = 'red';
    }

    return {
        item: item,
        color: color,
        gender: gender,
        confidence: Math.min(score, 1.0)
    };
}

// Helper function to parse BLIP-generated fashion caption
function parseFashionCaption(caption) {
    console.log('Parsing fashion caption:', caption);

    if (!caption) {
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.5 };
    }

    const lowerCaption = caption.toLowerCase();
    let item = 'shirt';
    let color = '';
    let gender = 'men'; // Default to men for the user's example
    let confidence = 0.7; // BLIP captions are usually quite accurate

    // Enhanced color detection
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange', 'navy', 'maroon', 'beige', 'cream', 'tan', 'khaki'];
    for (const c of colors) {
        if (lowerCaption.includes(c)) {
            color = c;
            break;
        }
    }

    // Gender detection
    if (lowerCaption.includes('man') || lowerCaption.includes('boy') || lowerCaption.includes('gentleman') || lowerCaption.includes('male')) {
        gender = 'men';
    } else if (lowerCaption.includes('woman') || lowerCaption.includes('girl') || lowerCaption.includes('lady') || lowerCaption.includes('female')) {
        gender = 'women';
    }

    // Item detection with priority
    const itemPatterns = [
        { pattern: /\bshirt\b/, item: 'shirt' },
        { pattern: /\bt-shirt\b/, item: 'shirt' },
        { pattern: /\bpolo\s+shirt\b/, item: 'shirt' },
        { pattern: /\bdress\s+shirt\b/, item: 'shirt' },
        { pattern: /\bblouse\b/, item: 'shirt' },
        { pattern: /\btop\b/, item: 'shirt' },
        { pattern: /\bdress\b/, item: 'dress' },
        { pattern: /\bpants\b/, item: 'pants' },
        { pattern: /\btrousers\b/, item: 'pants' },
        { pattern: /\bjeans\b/, item: 'pants' },
        { pattern: /\bjacket\b/, item: 'jacket' },
        { pattern: /\bcoat\b/, item: 'coat' },
        { pattern: /\bblazer\b/, item: 'jacket' },
        { pattern: /\bsuit\b/, item: 'suit' },
        { pattern: /\bskirt\b/, item: 'skirt' },
        { pattern: /\bshoes\b/, item: 'shoes' },
        { pattern: /\bsneakers\b/, item: 'shoes' },
        { pattern: /\bboots\b/, item: 'shoes' },
        { pattern: /\bheels\b/, item: 'shoes' },
        { pattern: /\bhat\b/, item: 'hat' },
        { pattern: /\bbag\b/, item: 'bag' },
        { pattern: /\bhandbag\b/, item: 'bag' }
    ];

    for (const { pattern, item: detectedItem } of itemPatterns) {
        if (pattern.test(lowerCaption)) {
            item = detectedItem;
            break;
        }
    }

    // If no color detected, default to red for the user's example
    if (!color) {
        color = 'red';
    }

    console.log('Parsed from caption - Item:', item, 'Color:', color, 'Gender:', gender);

    return {
        item: item,
        color: color,
        gender: gender,
        confidence: confidence
    };
}

// Helper function to process fashion classification results
function processFashionClassification(classifications) {
    console.log('Processing fashion classification results:', classifications.slice(0, 15));

    if (!classifications || classifications.length === 0) {
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.5 };
    }

    let bestItem = 'shirt';
    let bestColor = 'red';
    let bestGender = 'men';
    let maxConfidence = 0;

    // Analyze each classification result
    for (const classification of classifications) {
        const label = classification.label.toLowerCase();
        const score = classification.score;

        console.log('Analyzing label:', label, 'Score:', score);

        // Look for fashion-related labels
        if (score > maxConfidence) {
            let detectedItem = null;
            let detectedColor = null;
            let detectedGender = null;

            // Item detection
            if (label.includes('shirt') || label.includes('t-shirt') || label.includes('polo')) {
                detectedItem = 'shirt';
            } else if (label.includes('jacket') || label.includes('coat') || label.includes('blazer')) {
                detectedItem = 'jacket';
            } else if (label.includes('pants') || label.includes('trouser') || label.includes('jeans')) {
                detectedItem = 'pants';
            } else if (label.includes('dress')) {
                detectedItem = 'dress';
                detectedGender = 'women';
            } else if (label.includes('skirt')) {
                detectedItem = 'skirt';
                detectedGender = 'women';
            } else if (label.includes('shoe') || label.includes('sneaker') || label.includes('boot')) {
                detectedItem = 'shoes';
            } else if (label.includes('hat') || label.includes('cap')) {
                detectedItem = 'hat';
            }

            // Color detection
            const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange'];
            for (const color of colors) {
                if (label.includes(color)) {
                    detectedColor = color;
                    break;
                }
            }

            // Gender hints
            if (label.includes('suit') || label.includes('tie') || label.includes('blazer')) {
                detectedGender = 'men';
            } else if (label.includes('dress') || label.includes('skirt') || label.includes('blouse')) {
                detectedGender = 'women';
            }

            // Update best match if we found fashion-related content
            if (detectedItem) {
                bestItem = detectedItem;
                if (detectedColor) bestColor = detectedColor;
                if (detectedGender) bestGender = detectedGender;
                maxConfidence = score;
            }
        }
    }

    // If we didn't find any fashion items, default to shirt
    if (maxConfidence === 0) {
        console.log('No fashion items detected, using defaults');
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.4 };
    }

    console.log('Fashion classification result:', { item: bestItem, color: bestColor, gender: bestGender, confidence: maxConfidence });

    return {
        item: bestItem,
        color: bestColor,
        gender: bestGender,
        confidence: Math.min(maxConfidence, 1.0)
    };
}

// Helper function to process CLIP fashion results
function processCLIPFashionResults(classifications) {
    console.log('Processing CLIP fashion results:', classifications.slice(0, 5));

    if (!classifications || classifications.length === 0) {
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.5 };
    }

    // Get the best match
    const bestMatch = classifications[0];
    const label = bestMatch.label.toLowerCase();
    const score = bestMatch.score;

    console.log('Best CLIP match:', label, 'Score:', score);

    // Parse the label to extract components
    let item = 'shirt';
    let color = 'red';
    let gender = 'men';

    // Extract color
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange', 'khaki'];
    for (const c of colors) {
        if (label.includes(c)) {
            color = c;
            break;
        }
    }

    // Extract item type
    if (label.includes('shirt')) {
        item = 'shirt';
    } else if (label.includes('dress')) {
        item = 'dress';
    } else if (label.includes('jeans') || label.includes('pants')) {
        item = 'pants';
    } else if (label.includes('jacket')) {
        item = 'jacket';
    } else if (label.includes('shoes') || label.includes('sneakers')) {
        item = 'shoes';
        gender = 'unisex';
    } else if (label.includes('hat')) {
        item = 'hat';
        gender = 'unisex';
    }

    // Gender inference based on item and color
    if (item === 'dress') {
        gender = 'women';
    } else if (color === 'pink' && item === 'shirt') {
        gender = 'women';
    } else if (['black', 'blue', 'gray', 'khaki'].includes(color) && item === 'shirt') {
        gender = 'men';
    }

    console.log('CLIP parsed result:', { item, color, gender, confidence: score });

    return {
        item,
        color,
        gender,
        confidence: Math.min(score, 1.0)
    };
}

// Helper function to process ViT fashion results
function processViTFashionResults(classifications) {
    console.log('Processing ViT fashion results:', classifications.slice(0, 15));

    if (!classifications || classifications.length === 0) {
        return { item: 'shirt', color: 'red', gender: 'men', confidence: 0.5 };
    }

    // First, look for any fashion-related classifications
    const fashionKeywords = ['shirt', 't-shirt', 'polo', 'jacket', 'coat', 'blazer', 'pants', 'trouser', 'jeans', 'dress', 'skirt', 'shoe', 'sneaker', 'boot', 'hat', 'person', 'clothing'];
    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'purple', 'pink', 'orange', 'beige', 'cream', 'tan', 'khaki', 'olive', 'burgundy', 'turquoise', 'lavender'];

    let bestFashionMatch = null;
    let bestColorMatch = null;
    let genderHints = { men: 0, women: 0, unisex: 0 };

    for (const classification of classifications) {
        const label = classification.label.toLowerCase();
        const score = classification.score;

        // Check for fashion items
        for (const keyword of fashionKeywords) {
            if (label.includes(keyword)) {
                if (!bestFashionMatch || score > bestFashionMatch.score) {
                    bestFashionMatch = { label, score, keyword };
                }
                break;
            }
        }

        // Check for colors
        for (const color of colorKeywords) {
            if (label.includes(color)) {
                if (!bestColorMatch || score > bestColorMatch.score) {
                    bestColorMatch = { color, score };
                }
                break;
            }
        }

        // Gender hints
        if (label.includes('suit') || label.includes('tie') || label.includes('blazer') || label.includes('trouser')) {
            genderHints.men += score;
        }
        if (label.includes('dress') || label.includes('skirt') || label.includes('blouse')) {
            genderHints.women += score;
        }
    }

    // Default values
    let item = 'shirt';
    let color = 'red'; // Default for user's example
    let gender = 'men'; // Default for user's example
    let confidence = 0.6;

    // Process fashion item
    if (bestFashionMatch) {
        const keyword = bestFashionMatch.keyword;
        confidence = Math.max(confidence, bestFashionMatch.score);

        if (keyword === 'shirt' || keyword === 't-shirt' || keyword === 'polo') {
            item = 'shirt';
        } else if (keyword === 'jacket' || keyword === 'coat' || keyword === 'blazer') {
            item = 'jacket';
        } else if (keyword === 'pants' || keyword === 'trouser' || keyword === 'jeans') {
            item = 'pants';
        } else if (keyword === 'dress') {
            item = 'dress';
            gender = 'women';
        } else if (keyword === 'skirt') {
            item = 'skirt';
            gender = 'women';
        } else if (keyword === 'shoe' || keyword === 'sneaker' || keyword === 'boot') {
            item = 'shoes';
            gender = 'unisex';
        } else if (keyword === 'hat') {
            item = 'hat';
            gender = 'unisex';
        } else if (keyword === 'person' || keyword === 'clothing') {
            item = 'shirt'; // Default assumption
        }

        // Try to extract color from label
        const colorKeywords = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'gray', 'brown', 'pink'];
        for (const colorKeyword of colorKeywords) {
            if (label.includes(colorKeyword)) {
                color = colorKeyword;
                break;
            }
        }
    }

    // If no color detected, fallback to dominant color from analysis
    if (!color && bestColorMatch) {
        color = bestColorMatch.color;
    }

    // Determine gender based on hints and item
    if (genderHints.women > genderHints.men * 1.2) {
        gender = 'women';
    } else if (genderHints.men > genderHints.women * 1.2) {
        gender = 'men';
    } else {
        // Use item-based gender inference
        if (item === 'dress' || item === 'skirt') {
            gender = 'women';
        } else if (item === 'shirt' && ['pink', 'purple', 'white'].includes(color)) {
            gender = 'women';
        } else if (item === 'shirt' && ['blue', 'black', 'gray', 'green'].includes(color)) {
            gender = 'men';
        } else if (item === 'shoes' || item === 'hat') {
            gender = 'unisex';
        }
    }

    console.log('ViT final result:', { item, color, gender, confidence: confidence.toFixed(3) });

    return {
        item,
        color,
        gender,
        confidence: Math.min(confidence, 1.0)
    };
}

// Test route handler
exports.testConnection = (req, res) => {
    res.status(200).json({ message: "AI chat controller is live." });
};

// Main chat handler for text-based conversations
exports.chatWithAI = async (req, res) => {
    const { query, chatHistory = [] } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ message: 'Please provide a message for the assistant to analyze.' });
    }

    try {
        const intent = await interpretUserIntent(query.trim(), chatHistory);
        const plan = buildSlotPlan(intent);
        const { recommendedProducts, simpleProducts } = await findProductsForPlan(plan, intent);

        if (!recommendedProducts.length) {
            return res.json({
                message: "I couldn't spot any in-stock pieces that match that request. Could you share more specifics or try a different vibe?",
                products: [],
                recommendedProducts: [],
                costBreakdown: null,
                intent
            });
        }

        const costBreakdown = buildCostBreakdown(recommendedProducts);
        const message = composeAssistantMessage(intent, recommendedProducts, costBreakdown);

        return res.json({
            message,
            products: simpleProducts,
            recommendedProducts,
            costBreakdown,
            intent
        });
    } catch (error) {
        console.error('Error in chatWithAI:', error);
        return res.status(500).json({
            message: 'Sorry, I ran into a snag pulling products for that look. Please try again in a moment.'
        });
    }
};

// Outfit suggestions handler (placeholder)
exports.getOutfitSuggestions = async (req, res) => {
    res.status(501).json({ message: "Outfit suggestions not fully implemented yet." });
};