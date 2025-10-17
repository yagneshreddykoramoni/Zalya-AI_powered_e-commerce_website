// Test Hugging Face API directly
const { HfInference } = require('@huggingface/inference');

const testHuggingFaceAPI = async () => {
    try {
        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

        console.log('Testing Hugging Face API...');
        console.log('API Key exists:', !!process.env.HUGGINGFACE_API_KEY);
        console.log('API Key starts with:', process.env.HUGGINGFACE_API_KEY?.substring(0, 10));

        // Test image (1x1 red pixel)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const testImageDataURL = `data:image/png;base64,${testImageBase64}`;

        // Test 1: Image captioning (BLIP)
        console.log('\n1. Testing BLIP image captioning...');
        try {
            const captionResponse = await hf.imageToText({
                model: 'Salesforce/blip-image-captioning-large',
                inputs: testImageDataURL
            });
            console.log('✅ BLIP Success:', captionResponse);
        } catch (error) {
            console.log('❌ BLIP Failed:', error.message);
        }

        // Test 2: Image classification (ViT)
        console.log('\n2. Testing ViT image classification...');
        try {
            const classResponse = await hf.imageClassification({
                model: 'google/vit-base-patch16-224',
                inputs: testImageDataURL
            });
            console.log('✅ ViT Success:', classResponse.slice(0, 5));
        } catch (error) {
            console.log('❌ ViT Failed:', error.message);
        }

        // Test 3: Text classification (as baseline)
        console.log('\n3. Testing text classification as baseline...');
        try {
            const textResponse = await hf.textClassification({
                model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
                inputs: 'I love this red shirt!'
            });
            console.log('✅ Text Classification Success:', textResponse);
        } catch (error) {
            console.log('❌ Text Classification Failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Run the test
require('dotenv').config();
testHuggingFaceAPI();