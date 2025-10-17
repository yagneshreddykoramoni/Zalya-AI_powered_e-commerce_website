import api from './api';

export const createPost = async (content: string, image?: string, taggedProducts?: string[]) => {
  return api.post('/community', { content, image, taggedProducts });
};

export const getPosts = async () => {
  return api.get('/community');
};

export const likePost = async (postId: string) => {
  return api.post(`/community/${postId}/like`);
};

export const addComment = async (postId: string, comment: string) => {
  return api.post(`/community/${postId}/comments`, { content: comment });
};

export const sharePost = async (postId: string) => {
  return api.post(`/community/${postId}/share`);
};

export const toggleSavePost = async (postId: string) => {
  return api.post(`/community/${postId}/save`);
};

export const deletePost = async (postId: string) => {
  return api.delete(`/community/${postId}`);
};

// Add these new service methods
export const getUsersToFollow = async () => {
  return api.get('/community/users');
};

export const toggleFollowUser = async (userId: string) => {
  return api.post(`/community/users/${userId}/follow`);
};

export const getFollowingPosts = async () => {
  return api.get('/community/following-posts');
};