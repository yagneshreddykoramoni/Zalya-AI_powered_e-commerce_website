const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Directory where product images will be stored
const PRODUCT_IMAGES_DIR = path.join(__dirname, '../uploads/products');

// Ensure the directory exists
if (!fs.existsSync(PRODUCT_IMAGES_DIR)) {
    fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
}

/**
 * Downloads an image from a URL and saves it to the server
 * @param {string} imageUrl - The URL of the image to download
 * @returns {Promise<string>} - The path to the saved image
 */
async function downloadImage(imageUrl) {
    try {
        // Generate a unique filename
        const fileExtension = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const filename = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
        const filePath = path.join(PRODUCT_IMAGES_DIR, filename);

        // Download the image
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream',
        });

        // Save the image to disk
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(`/uploads/products/${filename}`));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading image:', error);
        return null;
    }
}

/**
 * Processes an array of image URLs, downloading them to the server
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<string[]>} - Array of local image paths
 */
async function processProductImages(imageUrls) {
    const localPaths = [];

    for (const url of imageUrls) {
        // Skip URLs that are already local
        if (url.startsWith('/uploads/')) {
            localPaths.push(url);
            continue;
        }

        // Download external images
        const localPath = await downloadImage(url);
        if (localPath) {
            localPaths.push(localPath);
        } else {
            // If download fails, keep the original URL
            localPaths.push(url);
        }
    }

    return localPaths;
}

module.exports = {
    downloadImage,
    processProductImages
};