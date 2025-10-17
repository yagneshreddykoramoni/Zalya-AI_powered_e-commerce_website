const mongoose = require('mongoose');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/styleverse', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function debugSearch() {
    try {
        const query = "Show me some casual shirts";
        console.log('Original query:', query);

        // Extract the same logic from the AI controller
        const extractCriteria = (query) => {
            const normalizedQuery = query.toLowerCase();

            // Gender detection
            let gender = null;
            if (normalizedQuery.includes('men') || normalizedQuery.includes('boys') || normalizedQuery.includes('male')) {
                gender = 'men';
            } else if (normalizedQuery.includes('women') || normalizedQuery.includes('girls') || normalizedQuery.includes('female') || normalizedQuery.includes('ladies')) {
                gender = 'women';
            }

            // Color extraction
            const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'brown', 'grey', 'gray'];
            const extractedColors = colors.filter(color => normalizedQuery.includes(color));

            // Price range extraction
            let priceRange = null;
            const priceMatch = normalizedQuery.match(/(?:under|below|less than|<)\s*₹?(\d+)|₹?(\d+)\s*(?:to|-)\s*₹?(\d+)|(?:above|over|more than|>)\s*₹?(\d+)/);
            if (priceMatch) {
                if (priceMatch[1]) {
                    priceRange = { max: parseInt(priceMatch[1]) };
                } else if (priceMatch[2] && priceMatch[3]) {
                    priceRange = { min: parseInt(priceMatch[2]), max: parseInt(priceMatch[3]) };
                } else if (priceMatch[4]) {
                    priceRange = { min: parseInt(priceMatch[4]) };
                }
            }

            return { gender, colors: extractedColors, priceRange };
        };

        const criteria = extractCriteria(query);
        console.log('Extracted criteria:', criteria);

        // Build filter conditions
        let filterConditions = [];

        // Gender filtering
        if (criteria.gender) {
            if (criteria.gender === 'men') {
                filterConditions.push({
                    $or: [
                        { category: { $regex: 'men', $options: 'i' } },
                        { tags: { $regex: 'men', $options: 'i' } }
                    ]
                });
            } else if (criteria.gender === 'women') {
                filterConditions.push({
                    $or: [
                        { category: { $regex: 'women', $options: 'i' } },
                        { tags: { $regex: 'women', $options: 'i' } }
                    ]
                });
            }
        }

        // Color filtering
        if (criteria.colors && criteria.colors.length > 0) {
            filterConditions.push({
                colors: { $in: criteria.colors.map(color => new RegExp(color, 'i')) }
            });
        }

        // Price filtering
        if (criteria.priceRange) {
            const priceFilter = {};
            if (criteria.priceRange.min) priceFilter.$gte = criteria.priceRange.min;
            if (criteria.priceRange.max) priceFilter.$lte = criteria.priceRange.max;
            filterConditions.push({ price: priceFilter });
        }

        // Keyword extraction and filtering
        const stopWords = ['show', 'me', 'some', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'i', 'want', 'need', 'looking', 'find', 'get', 'buy', 'purchase', 'see', 'view'];
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !stopWords.includes(word));
        const meaningfulKeywords = queryWords.filter(keyword =>
            !['men', 'women', 'male', 'female', 'boys', 'girls', 'ladies'].includes(keyword)
        );

        console.log('Query words:', queryWords);
        console.log('Meaningful keywords:', meaningfulKeywords);

        if (meaningfulKeywords.length > 0) {
            const keywordQueries = meaningfulKeywords.map(keyword => ({
                $or: [
                    { name: { $regex: keyword, $options: 'i' } },
                    { description: { $regex: keyword, $options: 'i' } },
                    { tags: { $regex: keyword, $options: 'i' } }
                ]
            }));
            filterConditions.push(...keywordQueries);
        }

        // Always ensure we return products with stock
        filterConditions.push({ stock: { $gt: 0 } });

        // Build the final filter
        const filter = filterConditions.length > 0 ? { $and: filterConditions } : { stock: { $gt: 0 } };

        console.log('Final search filter:', JSON.stringify(filter, null, 2));

        // Execute query
        let products = await Product.find(filter)
            .sort({ rating: -1 })
            .limit(10)
            .lean();

        console.log(`Found ${products.length} products:`);
        products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - ${product.category} - ${product.subcategory} - ₹${product.price}`);
        });

        // Now let's specifically search for men's shirts
        console.log('\n--- Searching specifically for men\'s shirts ---');
        const mensShirtFilter = {
            $and: [
                { stock: { $gt: 0 } },
                {
                    $or: [
                        { category: { $regex: 'men', $options: 'i' } },
                        { tags: { $regex: 'men', $options: 'i' } }
                    ]
                },
                {
                    $or: [
                        { name: { $regex: 'shirt', $options: 'i' } },
                        { description: { $regex: 'shirt', $options: 'i' } },
                        { tags: { $regex: 'shirt', $options: 'i' } },
                        { subcategory: { $regex: 'shirt', $options: 'i' } }
                    ]
                }
            ]
        };

        const mensShirts = await Product.find(mensShirtFilter)
            .sort({ rating: -1 })
            .limit(10)
            .lean();

        console.log(`Found ${mensShirts.length} men's shirts:`);
        mensShirts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - ${product.category} - ${product.subcategory} - ₹${product.price}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

debugSearch();
