// Test script to debug product search order
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://yagneshreddykoramoni:Nanda@cluster0.rd8mb01.mongodb.net/smartshop');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Simulate the actual search that happens in AI chat controller
const testSearchLogic = async () => {
    await connectDB();

    try {
        console.log('\n=== Simulating search for "casual shirts" (no gender specified) ===');

        // This simulates what extractSearchCriteria would extract
        const criteria = {
            originalQuery: "Show me some casual shirts",
            occasion: "casual",
            category: "tops" // "shirt" maps to "tops" in the categories mapping
        };

        console.log('Extracted criteria:', criteria);

        // This simulates the searchProducts function
        const filterConditions = [];

        // No gender filter since not specified

        // Occasion filter
        if (criteria.occasion) {
            filterConditions.push({
                $or: [
                    { occasion: { $in: [new RegExp(criteria.occasion, 'i')] } },
                    { description: { $regex: criteria.occasion, $options: 'i' } },
                    { tags: { $regex: criteria.occasion, $options: 'i' } }
                ]
            });
        }

        // Category filter
        if (criteria.category) {
            filterConditions.push({
                $or: [
                    { category: { $regex: criteria.category, $options: 'i' } },
                    { subcategory: { $regex: criteria.category, $options: 'i' } }
                ]
            });
        }

        // Add text search on name and description
        const originalQuery = criteria.originalQuery || '';
        if (originalQuery && originalQuery.length > 3) {
            const keywordQueries = originalQuery.split(' ')
                .filter(word => word.length > 3)
                .map(keyword => ({
                    $or: [
                        { name: { $regex: keyword, $options: 'i' } },
                        { description: { $regex: keyword, $options: 'i' } },
                        { tags: { $regex: keyword, $options: 'i' } }
                    ]
                }));

            if (keywordQueries.length > 0) {
                filterConditions.push(...keywordQueries);
            }
        }

        // Always ensure we return products with stock
        filterConditions.push({ stock: { $gt: 0 } });

        // Build the final filter
        const filter = filterConditions.length > 0 ? { $and: filterConditions } : { stock: { $gt: 0 } };

        console.log('Search filter:', JSON.stringify(filter, null, 2));

        // Execute query
        let products = await Product.find(filter)
            .sort({ rating: -1 })
            .limit(10)
            .lean();

        console.log(`\nFound ${products.length} products:`);
        products.forEach((p, index) => {
            console.log(`${index + 1}. ${p.name}`);
            console.log(`   Category: ${p.category}/${p.subcategory}`);
            console.log(`   Rating: ${p.rating}`);
            console.log(`   Occasion: ${p.occasion}`);
            console.log(`   ---`);
        });

    } catch (error) {
        console.error('Error in search logic test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

testSearchLogic();
