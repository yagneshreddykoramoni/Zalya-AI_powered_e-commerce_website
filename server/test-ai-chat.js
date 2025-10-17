// Test script for AI chat API POST endpoint
const testAiChatEndpoint = async () => {
    try {
        const requestData = {
            query: "Show me some casual shirts",
            chatHistory: [
                {
                    id: "1",
                    text: "Hello! I'm your fashion assistant. How can I help you today?",
                    sender: "bot",
                    timestamp: new Date()
                }
            ]
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
        console.log('AI chat response:', data);

        return data;
    } catch (error) {
        console.error('Error testing AI chat endpoint:', error);
        return null;
    }
};

testAiChatEndpoint();
