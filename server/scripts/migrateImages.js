require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { processProductImages } = require('../utils/imageHandler');

async function migrateImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products to process`);

    let migratedCount = 0;

    // Process each product
    for (const product of products) {
      console.log(`Processing product: ${product.name}`);

      // Process images for this product
      const localImagePaths = await processProductImages(product.images);

      // Update product with local image paths
      if (JSON.stringify(localImagePaths) !== JSON.stringify(product.images)) {
        product.images = localImagePaths;
        await product.save();
        migratedCount++;
        console.log(`Updated images for product: ${product.name}`);
      } else {
        console.log(`No changes needed for product: ${product.name}`);
      }
    }

    console.log(`Successfully migrated images for ${migratedCount} products`);
  } catch (error) {
    console.error('Error migrating images:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrateImages();