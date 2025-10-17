// Test script for AI chat API
const testAiEndpoint = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/ai/test');
        const data = await response.json();
        console.log('Test endpoint response:', data);

        return data;
    } catch (error) {
        console.error('Error testing AI endpoint:', error);
        return null;
    }
};

testAiEndpoint();
