// Test script for Fashion Recognition API endpoint
const testFashionRecognition = async () => {
    try {
        // Create a simple test image data (base64 encoded red square)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const testImageDataURL = `data:image/png;base64,${testImageBase64}`;

        const requestData = {
            image: testImageDataURL
        };

        console.log('Testing Fashion Recognition endpoint...');
        console.log('Request data:', {
            image: testImageDataURL.substring(0, 100) + '... (truncated)'
        });

        const response = await fetch('http://localhost:5000/api/ai/fashion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('\n=== Fashion Recognition Results ===');
        console.log('Detected Item:', data.detectedItem);
        console.log('Detected Color:', data.detectedColor);
        console.log('Detected Gender:', data.detectedGender);
        console.log('Confidence:', data.confidence);
        console.log('Raw Caption:', data.rawCaption);

        if (data.recommendations && data.recommendations.length > 0) {
            console.log('\n=== Product Recommendations ===');
            data.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec.recommendation || 'Recommendation'}`);
                if (rec.products) {
                    rec.products.forEach((product, pIndex) => {
                        console.log(`   - ${product.name} (${product.brand}) - $${product.price}`);
                    });
                }
            });
        } else {
            console.log('Text Recommendations:', data.recommendations);
        }

        console.log('\n=== Test Summary ===');
        console.log('✅ API endpoint is working');
        console.log(`✅ Image was processed (confidence: ${data.confidence})`);
        console.log(`✅ Response format: The given image has a ${data.detectedColor} ${data.detectedGender}'s ${data.detectedItem}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error details:', error.message);
    }
};

// Test with different image types
const testMultipleImages = async () => {
    console.log('\n=== Testing Multiple Image Scenarios ===\n');

    // Test 1: Base64 only (no data URL prefix)
    console.log('Test 1: Base64 only');
    const testImageBase64Only = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    await testSingleImage(testImageBase64Only, 'Base64 only');

    // Test 2: Full data URL
    console.log('\nTest 2: Full data URL');
    const testImageDataURL = `data:image/png;base64,${testImageBase64Only}`;
    await testSingleImage(testImageDataURL, 'Full data URL');

    // Test 3: Different image data (simulate different image)
    console.log('\nTest 3: Different image data');
    const differentImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHdkEJOzgAAAABJRU5ErkJggg==';
    await testSingleImage(`data:image/png;base64,${differentImageBase64}`, 'Different image');
};

const testSingleImage = async (imageData, testName) => {
    try {
        const response = await fetch('http://localhost:5000/api/ai/fashion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`${testName}: ${data.detectedColor} ${data.detectedGender}'s ${data.detectedItem} (confidence: ${data.confidence})`);
            console.log(`  Raw: ${data.rawCaption}`);
        } else {
            console.log(`${testName}: Failed (${response.status})`);
        }
    } catch (error) {
        console.log(`${testName}: Error - ${error.message}`);
    }
};

// Run the tests
console.log('🧪 Starting Fashion Recognition Tests...\n');

testFashionRecognition().then(() => {
    return testMultipleImages();
}).then(() => {
    console.log('\n✅ All tests completed!');
}).catch((error) => {
    console.error('❌ Test suite failed:', error);
});