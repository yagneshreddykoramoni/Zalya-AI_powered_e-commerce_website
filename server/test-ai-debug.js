// Test script to understand the AI chat search issue
const testAiChatWithDebug = async () => {
    try {
        const requestData = {
            query: "Show me some casual shirts for men",
            chatHistory: []
        };

        console.log('Sending request to AI chat endpoint:', requestData);

        const response = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();
        console.log('\n=== AI chat response ===');
        console.log('Message:', data.message);
        console.log('\nProducts returned:');
        data.products.forEach((p, index) => {
            console.log(`${index + 1}. ${p.name}`);
            console.log(`   Category: ${p.category}/${p.subcategory}`);
            console.log(`   Price: ₹${p.price}`);
            console.log(`   Discount: ₹${p.discountPrice || 'None'}`);
            console.log('   ---');
        });

        return data;
    } catch (error) {
        console.error('Error testing AI chat endpoint:', error);
        return null;
    }
};

testAiChatWithDebug();
