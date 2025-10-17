// Test script to verify following functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Helper function to make authenticated requests
const makeAuthRequest = async (token, method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error making ${method} request to ${endpoint}:`, error.response?.data || error.message);
        return null;
    }
};

// Test the following functionality
const testFollowingFunctionality = async () => {
    console.log('=== Testing Following Functionality ===\n');

    // You would need to replace these with actual tokens from logged-in users
    const user1Token = 'YOUR_USER1_TOKEN_HERE';
    const user2Token = 'YOUR_USER2_TOKEN_HERE';

    if (user1Token === 'YOUR_USER1_TOKEN_HERE') {
        console.log('⚠️  Please update the tokens in this script with actual user tokens');
        console.log('   You can get tokens by logging in through the UI and checking the browser\'s localStorage');
        return;
    }

    // Test 1: Get users to follow for user1
    console.log('1. Getting users to follow for user1...');
    const usersToFollow = await makeAuthRequest(user1Token, 'GET', '/community/users');
    console.log('Users to follow:', usersToFollow?.length || 0);

    // Test 2: Get following posts (should be empty initially)
    console.log('\n2. Getting following posts for user1 (should be empty)...');
    const initialFollowingPosts = await makeAuthRequest(user1Token, 'GET', '/community/following-posts');
    console.log('Initial following posts:', initialFollowingPosts?.length || 0);

    if (usersToFollow && usersToFollow.length > 0) {
        const userToFollow = usersToFollow[0];
        console.log(`\n3. User1 following user: ${userToFollow.name}`);

        // Test 3: Follow a user
        const followResult = await makeAuthRequest(user1Token, 'POST', `/community/users/${userToFollow._id}/follow`);
        console.log('Follow result:', followResult);

        // Test 4: Get following posts again (should show posts from followed user)
        console.log('\n4. Getting following posts after following...');
        const newFollowingPosts = await makeAuthRequest(user1Token, 'GET', '/community/following-posts');
        console.log('Following posts after follow:', newFollowingPosts?.length || 0);

        // Test 5: Unfollow the user
        console.log('\n5. Unfollowing user...');
        const unfollowResult = await makeAuthRequest(user1Token, 'POST', `/community/users/${userToFollow._id}/follow`);
        console.log('Unfollow result:', unfollowResult);

        // Test 6: Get following posts again (should be empty)
        console.log('\n6. Getting following posts after unfollowing...');
        const finalFollowingPosts = await makeAuthRequest(user1Token, 'GET', '/community/following-posts');
        console.log('Following posts after unfollow:', finalFollowingPosts?.length || 0);
    }

    console.log('\n=== Test Complete ===');
};

// Run the test
testFollowingFunctionality().catch(console.error);
