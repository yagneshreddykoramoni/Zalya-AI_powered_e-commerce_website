// Test script to check what products are available for "casual shirts"
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

const testProductSearch = async () => {
    await connectDB();

    try {
        // Test 1: Look for products with "shirt" in name or category
        console.log('\n=== Test 1: Products with "shirt" in name ===');
        const shirtProducts = await Product.find({
            $or: [
                { name: { $regex: 'shirt', $options: 'i' } },
                { category: { $regex: 'shirt', $options: 'i' } },
                { subcategory: { $regex: 'shirt', $options: 'i' } }
            ]
        }).lean();

        console.log(`Found ${shirtProducts.length} products with "shirt":`);
        shirtProducts.forEach(p => {
            console.log(`- ${p.name} (${p.category}/${p.subcategory})`);
        });

        // Test 2: Look for products with "casual" in tags or occasion
        console.log('\n=== Test 2: Products with "casual" ===');
        const casualProducts = await Product.find({
            $or: [
                { tags: { $regex: 'casual', $options: 'i' } },
                { occasion: { $in: [/casual/i] } },
                { description: { $regex: 'casual', $options: 'i' } }
            ]
        }).lean();

        console.log(`Found ${casualProducts.length} products with "casual":`);
        casualProducts.slice(0, 5).forEach(p => {
            console.log(`- ${p.name} (${p.category}/${p.subcategory}) - Occasion: ${p.occasion || 'N/A'}`);
        });

        // Test 3: Look for men's products
        console.log('\n=== Test 3: Men\'s products ===');
        const mensProducts = await Product.find({
            $or: [
                { tags: { $regex: 'men', $options: 'i' } },
                { category: { $regex: 'men', $options: 'i' } },
                { description: { $regex: 'men', $options: 'i' } }
            ]
        }).lean();

        console.log(`Found ${mensProducts.length} men's products:`);
        mensProducts.slice(0, 5).forEach(p => {
            console.log(`- ${p.name} (${p.category}/${p.subcategory})`);
        });

        // Test 4: Look for tops/shirts in general
        console.log('\n=== Test 4: All tops/shirts ===');
        const topsProducts = await Product.find({
            $or: [
                { category: { $regex: 'tops', $options: 'i' } },
                { subcategory: { $regex: 'tops', $options: 'i' } },
                { category: { $regex: 'shirt', $options: 'i' } },
                { subcategory: { $regex: 'shirt', $options: 'i' } }
            ]
        }).lean();

        console.log(`Found ${topsProducts.length} tops/shirts:`);
        topsProducts.slice(0, 10).forEach(p => {
            console.log(`- ${p.name} (${p.category}/${p.subcategory}) - Tags: ${p.tags || 'N/A'}`);
        });

        // Test 5: Get a sample of all products to understand the data structure
        console.log('\n=== Test 5: Sample of all products ===');
        const sampleProducts = await Product.find({}).limit(10).lean();
        console.log(`Sample of ${sampleProducts.length} products:`);
        sampleProducts.forEach(p => {
            console.log(`- ${p.name}`);
            console.log(`  Category: ${p.category}/${p.subcategory}`);
            console.log(`  Tags: ${JSON.stringify(p.tags)}`);
            console.log(`  Occasion: ${JSON.stringify(p.occasion)}`);
            console.log(`  ---`);
        });

    } catch (error) {
        console.error('Error in product search test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

testProductSearch();
