// Test alternative image processing methods
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');

const testAlternativeImageProcessing = async () => {
    try {
        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

        console.log('Testing alternative image processing methods...\n');

        // Test different image formats
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        // Method 1: Raw base64 buffer
        console.log('1. Testing with raw buffer...');
        try {
            const buffer = Buffer.from(testImageBase64, 'base64');
            console.log('Buffer created, size:', buffer.length);

            const classResponse = await hf.imageClassification({
                model: 'microsoft/resnet-50',
                inputs: buffer
            });
            console.log('✅ ResNet with buffer Success:', classResponse.slice(0, 3));
        } catch (error) {
            console.log('❌ ResNet with buffer Failed:', error.message);
        }

        // Method 2: Try a smaller, simpler model
        console.log('\n2. Testing with simpler model...');
        try {
            const buffer = Buffer.from(testImageBase64, 'base64');
            const classResponse = await hf.imageClassification({
                model: 'google/vit-base-patch16-224',
                inputs: buffer
            });
            console.log('✅ ViT with buffer Success:', classResponse.slice(0, 3));
        } catch (error) {
            console.log('❌ ViT with buffer Failed:', error.message);
        }

        // Method 3: Test text-based fashion analysis as fallback
        console.log('\n3. Testing text-based fashion analysis...');
        try {
            const fashionQuery = "Analyze this fashion item: red shirt for men";
            const textResponse = await hf.textGeneration({
                model: 'microsoft/DialoGPT-medium',
                inputs: fashionQuery,
                parameters: {
                    max_new_tokens: 50,
                    temperature: 0.7
                }
            });
            console.log('✅ Text-based fashion analysis:', textResponse);
        } catch (error) {
            console.log('❌ Text-based analysis Failed:', error.message);
        }

        // Method 4: Try CLIP model for image understanding
        console.log('\n4. Testing CLIP model...');
        try {
            const buffer = Buffer.from(testImageBase64, 'base64');
            const clipResponse = await hf.imageClassification({
                model: 'openai/clip-vit-base-patch32',
                inputs: buffer
            });
            console.log('✅ CLIP Success:', clipResponse.slice(0, 3));
        } catch (error) {
            console.log('❌ CLIP Failed:', error.message);
        }

        // Method 5: Alternative image-to-text models
        console.log('\n5. Testing alternative image-to-text models...');
        const alternativeModels = [
            'microsoft/git-base',
            'nlpconnect/vit-gpt2-image-captioning',
            'Salesforce/blip-image-captioning-base'
        ];

        for (const model of alternativeModels) {
            try {
                console.log(`Testing ${model}...`);
                const buffer = Buffer.from(testImageBase64, 'base64');
                const response = await hf.imageToText({
                    model: model,
                    inputs: buffer
                });
                console.log(`✅ ${model} Success:`, response);
                break; // Stop at first working model
            } catch (error) {
                console.log(`❌ ${model} Failed:`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Run the test
require('dotenv').config();
testAlternativeImageProcessing();