const axios = require('axios');

async function testAIChat() {
    try {
        const testQueries = [
            "Show me some casual shirts",
            "I need casual shirts for men",
            "Show me casual shirts for women"
        ];

        for (const query of testQueries) {
            console.log(`\n=== Testing query: "${query}" ===`);

            const response = await axios.post('http://localhost:5000/api/ai-chat/chat', {
                query: query,
                chatHistory: [{
                    id: '1',
                    text: "Hello! I'm your fashion assistant. How can I help you today?",
                    sender: 'bot',
                    timestamp: new Date()
                }]
            });

            console.log('AI Response:', response.data.message.substring(0, 300) + '...');
            console.log(`\nProducts returned (${response.data.products.length}):`);
            response.data.products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} - ${product.category} - ${product.subcategory || 'N/A'} - ₹${product.price}`);
            });

            // Analyze if AI response matches products
            const aiText = response.data.message.toLowerCase();
            const actualProducts = response.data.products;

            console.log('\n--- Analysis ---');
            console.log('AI mentions shirts:', aiText.includes('shirt'));
            console.log('AI mentions tops:', aiText.includes('top'));
            console.log('Products are actually shirts:', actualProducts.some(p =>
                p.name.toLowerCase().includes('shirt') ||
                (p.subcategory && p.subcategory.toLowerCase().includes('shirt'))
            ));
            console.log('Products are actually tops:', actualProducts.some(p =>
                p.name.toLowerCase().includes('top') ||
                (p.subcategory && p.subcategory.toLowerCase().includes('top'))
            ));
        }
    } catch (error) {
        console.error('Error testing AI chat:', error.response ? error.response.data : error.message);
    }
}

testAIChat();
