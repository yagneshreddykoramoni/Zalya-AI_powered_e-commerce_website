import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Component imports
import Header from '../components/Header';
import Footer from '../components/Footer';

// UI Component imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// Icon imports
import { 
  Image, 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Tag, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown, 
  X,
  Trash2,
  Flag
} from 'lucide-react';
import ShareMenu from '@/components/ShareMenu';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Context and hooks
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Services
// Update your import from communityService
import { 
  createPost, 
  getPosts, 
  likePost, 
  addComment, 
  sharePost, 
  deletePost, 
  toggleSavePost,
  getUsersToFollow,
  getFollowingPosts,
  toggleFollowUser  // Add this import
} from '@/services/communityService';

import { getSocket } from '@/services/socketService';
import productService from '@/services/productService';

// Data and types
import { mockProducts } from '@/lib/mockData';
import { Product } from '@/lib/types';
import { getImageUrl } from '@/lib/utils';

// Interfaces
type UserReference = string | { _id?: string; id?: string };

interface CommunityComment {
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  createdAt: string;
}

interface CommunityPost {
  _id: string;
  userId: UserReference;
  userName: string;
  userImage?: string;
  content: string;
  image?: string;
  likes: string[];
  comments: CommunityComment[];
  taggedProducts?: Array<string | Product>;
  createdAt: string;
  savedBy?: string[];
}

interface SuggestedUser {
  _id: string;
  name: string;
  avatar?: string;
  isFollowing: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toUserIdString = (reference: UserReference | null | undefined): string | null => {
  if (typeof reference === 'string') {
    return reference;
  }

  if (reference && (reference._id || reference.id)) {
    return reference._id ?? reference.id ?? null;
  }

  return null;
};

const normalizeSuggestedUsers = (payload: unknown): SuggestedUser[] => {
  const projectArray = (value: unknown): SuggestedUser[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(isRecord)
      .map((candidate) => {
        const id = typeof candidate._id === 'string' ? candidate._id : null;
        const name = typeof candidate.name === 'string' ? candidate.name : null;
        if (!id || !name) {
          return null;
        }

        return {
          _id: id,
          name,
          avatar: typeof candidate.avatar === 'string' ? candidate.avatar : undefined,
          isFollowing: typeof candidate.isFollowing === 'boolean' ? candidate.isFollowing : false,
        } satisfies SuggestedUser;
      })
      .filter((candidate): candidate is SuggestedUser => candidate !== null);
  };

  if (Array.isArray(payload)) {
    return projectArray(payload);
  }

  if (isRecord(payload) && 'data' in payload) {
    return projectArray((payload as { data?: unknown }).data);
  }

  return [];
};

const normalizeCommunityPosts = (payload: unknown): CommunityPost[] => {
  const fromPayload = (value: unknown): CommunityPost[] => {
    if (Array.isArray(value)) {
      return value as CommunityPost[];
    }

    if (isRecord(value) && Array.isArray((value as { posts?: unknown }).posts)) {
      return (value as { posts: CommunityPost[] }).posts;
    }

    return [];
  };

  if (Array.isArray(payload)) {
    return payload as CommunityPost[];
  }

  if (isRecord(payload)) {
    const direct = fromPayload((payload as { posts?: unknown }).posts);
    if (direct.length) {
      return direct;
    }

    if ('data' in payload) {
      return fromPayload((payload as { data?: unknown }).data);
    }
  }

  return [];
};

const normalizeFollowingIds = (
  following: Array<string | { _id?: string; id?: string }> | undefined,
): string[] =>
  (following ?? [])
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }
      return entry?._id ?? entry?.id ?? null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

const Community: React.FC = () => {
  // Context and hooks
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const arrayLikeToBase64 = (value: ArrayLike<number>): string | undefined => {
    if (value.length === 0) {
      return undefined;
    }

    let binary = '';
    for (let index = 0; index < value.length; index += 1) {
      binary += String.fromCharCode(Number(value[index]) & 0xff);
    }

    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(binary);
    }

    return undefined;
  };

  const coerceProfilePictureObject = (input: Record<string, unknown>): string | undefined => {
    const directData = input.data;
    const contentType = typeof input.contentType === 'string' ? input.contentType : 'image/jpeg';

    if (typeof directData === 'string') {
      const trimmedData = directData.trim();
      if (!trimmedData) {
        return undefined;
      }
      if (trimmedData.startsWith('data:')) {
        return trimmedData;
      }
      return `data:${contentType};base64,${trimmedData}`;
    }

    if (directData && typeof directData === 'object') {
      const nested = directData as Record<string, unknown>;
      if (typeof nested.data === 'string') {
        const nestedString = nested.data.trim();
        if (nestedString.startsWith('data:')) {
          return nestedString;
        }
        if (nestedString) {
          return `data:${contentType};base64,${nestedString}`;
        }
      }

      if (Array.isArray(nested.data)) {
        const base64 = arrayLikeToBase64(nested.data);
        if (base64) {
          return `data:${contentType};base64,${base64}`;
        }
      }

      if (ArrayBuffer.isView(nested.data)) {
        const typedArray = nested.data as unknown as ArrayLike<number>;
        const base64 = arrayLikeToBase64(typedArray);
        if (base64) {
          return `data:${contentType};base64,${base64}`;
        }
      }
    }

    return undefined;
  };

  const coerceAvatarCandidate = (candidate: unknown): string | undefined => {
    if (!candidate) {
      return undefined;
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) {
        return undefined;
      }

      if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
        return trimmed;
      }

      try {
        return getImageUrl(trimmed);
      } catch (error) {
        console.warn('Failed to resolve avatar image path', error);
        return trimmed;
      }
    }

    if (typeof candidate === 'object') {
      const recordCandidate = candidate as Record<string, unknown>;

      if ('profilePicture' in recordCandidate) {
        const nested = coerceAvatarCandidate(recordCandidate.profilePicture);
        if (nested) {
          return nested;
        }
      }

      if ('avatar' in recordCandidate) {
        const nested = coerceAvatarCandidate(recordCandidate.avatar);
        if (nested) {
          return nested;
        }
      }

      if ('data' in recordCandidate || 'contentType' in recordCandidate) {
        const converted = coerceProfilePictureObject(recordCandidate);
        if (converted) {
          return converted;
        }
      }
    }

    return undefined;
  };

  const resolveAvatarImage = (...candidates: Array<unknown>) => {
    for (const candidate of candidates) {
      const resolved = coerceAvatarCandidate(candidate);
      if (resolved) {
        return resolved;
      }
    }
    return undefined;
  };

  // State for tabs and posts
  const [activeTab, setActiveTab] = useState('trending');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for new post creation
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [selectedTagProducts, setSelectedTagProducts] = useState<string[]>([]);

  // State for product selection dialog
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // State for comments
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);

  const [usersToFollow, setUsersToFollow] = useState<SuggestedUser[]>([]);
  const [followingPosts, setFollowingPosts] = useState<CommunityPost[]>([]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [hasLoadedFollowing, setHasLoadedFollowing] = useState(false);

  // Load posts and setup socket
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const response = await getPosts();
        const postsData = normalizeCommunityPosts(response);
        setPosts(postsData);
      } catch (error) {
        console.error('Error loading posts:', error);
        setPosts([]);
        toast({
          title: "Error loading posts",
          description: "Could not fetch community posts",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPosts();
    
    // Socket setup
    if (user) {
      const socket = getSocket();
      
      socket.on('postLiked', (updatedPost: CommunityPost) => {
        setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
        setFollowingPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
      });

      socket.on('postDeleted', (postId: string) => {
        setPosts(prev => prev.filter(p => p._id !== postId));
        setFollowingPosts(prev => prev.filter(p => p._id !== postId));
      });
      
      socket.on('postSaveToggled', (updatedPost: CommunityPost) => {
        setPosts(prev => prev.map(p => (p._id === updatedPost._id ? { ...p, savedBy: updatedPost.savedBy } : p)));
        setFollowingPosts(prev => prev.map(p => (p._id === updatedPost._id ? { ...p, savedBy: updatedPost.savedBy } : p)));
      });
      
      socket.on('postCommented', (updatedPost: CommunityPost) => {
        setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
        setFollowingPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

  // Add this for follow/unfollow updates
  socket.on('followUpdated', ({ userId, isFollowing }) => {
    if (isFollowing) {
      // When following someone, reload their posts
      getFollowingPosts().then(response => {
        setFollowingPosts(response.data);
      });
    } else {
      // When unfollowing, remove their posts
      setFollowingPosts(prev => 
        prev.filter(post => post.userId !== userId)
      );
    }
  });
      
      return () => {
        socket.off('postLiked');
        socket.off('postDeleted');
        socket.off('postSaveToggled');
        socket.off('postCommented');
        socket.off('connect_error');
        socket.off('followUpdated');
      };
    }
  }, [user, toast]);

  // Load products when dialog opens
  useEffect(() => {
    if (isProductDialogOpen && products.length === 0) {
      const fetchAllProducts = async () => {
        setIsProductsLoading(true);
        try {
          let allProducts = [];
          let currentPage = 1;
          let hasMorePages = true;

          while (hasMorePages) {
            const response = await productService.getProducts({ 
              page: currentPage,
              limit: 50
            });
            
            let pageProducts = [];
            let totalProducts = 0;
            let totalPages = 1;
            
            if (response.products) {
              pageProducts = response.products;
              totalProducts = response.total || response.totalProducts || pageProducts.length;
              totalPages = response.totalPages || Math.ceil(totalProducts / 50);
            } else if (Array.isArray(response.data)) {
              pageProducts = response.data;
              totalProducts = response.total || response.totalProducts || pageProducts.length;
              totalPages = response.totalPages || Math.ceil(totalProducts / 50);
            } else if (Array.isArray(response)) {
              pageProducts = response;
              totalProducts = pageProducts.length;
              totalPages = 1;
              hasMorePages = false;
            } else {
              pageProducts = response.products || response.data || [];
              totalProducts = response.total || response.totalProducts || pageProducts.length;
              totalPages = response.totalPages || 1;
            }
            
            allProducts = [...allProducts, ...pageProducts];
            
            if (currentPage >= totalPages || pageProducts.length === 0) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
            
            if (currentPage > 20) {
              console.warn('Reached maximum page limit (20), stopping fetch');
              hasMorePages = false;
            }
          }
          
          setProducts(allProducts);
        } catch (error) {
          console.error('Error loading products:', error);
          setProducts(mockProducts || []);
          toast({
            title: "Using sample products",
            description: "Could not fetch products from server, using sample data",
            variant: "default",
          });
        } finally {
          setIsProductsLoading(false);
        }
      };
      fetchAllProducts();
    }
  }, [isProductDialogOpen, products.length, toast]);

  // Load users to follow
useEffect(() => {
  if (user && activeTab === 'following') {
    setHasLoadedFollowing(false); // Reset the flag when switching to following tab
    const loadUsersToFollow = async () => {
      try {
        const response = await getUsersToFollow();
        setUsersToFollow(normalizeSuggestedUsers(response));
      } catch (error) {
        console.error('Error loading users to follow:', error);
      }
    };
    loadUsersToFollow();
  }
}, [user, activeTab]);

// Load following posts
useEffect(() => {
  if (user && activeTab === 'following') {
    const loadFollowingPosts = async () => {
      try {
        const response = await getFollowingPosts();
        setFollowingPosts(normalizeCommunityPosts(response));
        setHasLoadedFollowing(true);
      } catch (error) {
        console.error('Error loading following posts:', error);
        setFollowingPosts([]);
        setHasLoadedFollowing(true);
      }
    };
    loadFollowingPosts();
  }
}, [user, activeTab]); // user.following is part of user, so if user object updates, this runs.

// Socket event handlers for real-time updates in following tab
useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    
    socket.on('newPost', (post: CommunityPost) => {
      setPosts(prev => [post, ...prev]);

      if (activeTab === 'following' && user.following) {
        const postAuthorId = toUserIdString(post.userId);
        if (postAuthorId) {
          const followedUserIds = normalizeFollowingIds(user.following);
          if (followedUserIds.includes(postAuthorId)) {
            setFollowingPosts(prev => [post, ...prev]);
          }
        }
      }
    });

    return () => {
      socket.off('newPost');
    };
  }, [user, activeTab]);

// Socket for real-time updates
useEffect(() => {
  if (!user) return;

  const socket = getSocket();
  
  socket.on('followUpdated', (data: { userId: string, isFollowing: boolean }) => {
    setUsersToFollow(prev => prev.map(user => 
      user._id === data.userId 
        ? { ...user, isFollowing: data.isFollowing } 
        : user
    ));
  });

  return () => {
    socket.off('followUpdated');
  };
}, [user]);

const handleToggleFollow = async (userId: string) => {
  if (!user) return;
  
  try {
    setIsFollowingLoading(true);
    await toggleFollowUser(userId);
    // Socket will handle the real-time update
  } catch (error) {
    console.error('Error toggling follow:', error);
  } finally {
    setIsFollowingLoading(false);
  }
};

  // Utility functions
  const getProductInfo = (productId: string): Product | undefined => {
    const loadedProduct = products.find(product => 
      (product._id && product._id === productId) || 
      (product.id && product.id === productId)
    );
    
    if (loadedProduct) {
      return loadedProduct;
    }
    
    return mockProducts.find(product => 
      product.id === productId || product._id === productId
    );
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    const targetDate = new Date(timestamp);
    if (Number.isNaN(targetDate.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - targetDate.getTime();
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    
    return targetDate.toLocaleDateString();
  };

  // Event handlers
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !newPostImage) {
      toast({
        title: "Cannot create empty post",
        description: "Please add some text or an image to your post",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await createPost(newPostContent, newPostImage || undefined, selectedTagProducts);
      setNewPostContent('');
      setNewPostImage(null);
      setSelectedTagProducts([]);
      
      toast({
        title: "Post created",
        description: "Your post has been published to the community",
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Post creation error:', error);
      toast({
        title: "Error creating post",
        description: err.response?.data?.message || "Could not publish your post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
        toast({
            title: "Login Required",
            description: "Please login to like posts",
            variant: "destructive",
        });
        return;
    }

    try {
        await likePost(postId);
    } catch (error) {
        toast({
            title: "Error",
            description: "Could not like the post",
            variant: "destructive",
        });
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    if (!user) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }

    try {
      await addComment(postId, comment);
      const input = document.querySelector(`#comment-input-${postId}`) as HTMLInputElement;
      if (input) input.value = '';
      setActiveCommentPost(null);
    } catch (error) {
      toast({ title: "Error adding comment", variant: "destructive" });
    }
  };

  

  const handleDeletePost = async (postId: string) => {
    try {
      const confirmDelete = window.confirm("Are you sure you want to delete this post?");
      if (!confirmDelete) return;
  
      setIsLoading(true);
      await deletePost(postId);
      
      toast({
        title: "Post deleted",
        description: "Your post has been removed",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete post",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSave = async (postId: string) => {
    try {
      const postToUpdate = posts.find(p => p._id === postId);
      if (!postToUpdate) return;
  
      await toggleSavePost(postId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save/unsave post",
        variant: "destructive"
      });
    }
  };

  const handleTagProductsClick = () => {
    setIsProductDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast({
          title: "Error uploading image",
          description: "Failed to process the image",
          variant: "destructive",
        });
        return;
      }
      setNewPostImage(reader.result);
    };
    reader.onerror = () => {
      toast({
        title: "Error uploading image",
        description: "Failed to read the image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleProductTag = (productId: string) => {
    setSelectedTagProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Render functions
  const renderPosts = (sortedPosts: CommunityPost[]) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      );
    }

    if (sortedPosts.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">No posts found. Be the first to share!</p>
          </CardContent>
        </Card>
      );
    }

    return sortedPosts.map(post => {
      const currentUserId = user?._id ?? user?.id ?? '';
  const hasLiked = Boolean(currentUserId && post.likes.includes(currentUserId));
  const isSaved = Boolean(currentUserId && post.savedBy?.includes(currentUserId));

      const avatarSource = resolveAvatarImage(
        post.userImage,
        (post as unknown as { userProfilePicture?: unknown }).userProfilePicture,
        (post as unknown as { user?: { profilePicture?: unknown; avatar?: unknown } }).user?.profilePicture,
        (post as unknown as { user?: { profilePicture?: unknown; avatar?: unknown } }).user?.avatar,
        (post.userId as unknown as { profilePicture?: unknown; avatar?: unknown })?.profilePicture,
        (post.userId as unknown as { profilePicture?: unknown; avatar?: unknown })?.avatar,
        (post as unknown as { avatar?: unknown }).avatar
      );

      return (
        <Card key={post._id} className="overflow-hidden hover:shadow-md transition-shadow mb-6">
          <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage
                  src={avatarSource}
                  alt={post.userName ? `${post.userName}'s avatar` : 'User avatar'}
                />
                <AvatarFallback>{post.userName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{post.userName}</p>
                <p className="text-xs text-gray-500">{formatTimestamp(post.createdAt)}</p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(() => {
                  const postOwnerId = toUserIdString(post.userId);
                  const currentUserId = user?._id ?? user?.id ?? null;
                  
                  return postOwnerId !== null && currentUserId !== null && postOwnerId === currentUserId;
                })() ? (
                  <DropdownMenuItem 
                    className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    onClick={() => handleDeletePost(post._id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>
                    <Flag className="mr-2 h-4 w-4" />
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="mb-3">{post.content}</p>
          
          {post.image && (
            <div className="mb-3 rounded-md overflow-hidden">
              <img 
                src={post.image} 
                alt="Post content" 
                className="w-full rounded-md transition-transform hover:scale-105 duration-300"
              />
            </div>
          )}
          
          {post.taggedProducts && post.taggedProducts.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Tagged Products:</p>
              <div className="flex overflow-x-auto gap-2 pb-2">
                {post.taggedProducts.map(productId => {
                  const product = typeof productId === 'string' ? getProductInfo(productId) : productId;
                  return product ? (
                    <Link 
                      key={product._id || product.id}
                      to={`/product/${product._id || product.id}`}
                      className="flex items-center bg-gray-100 rounded p-2 gap-2 min-w-[200px] hover:bg-gray-200 transition-colors"
                    >
                      <div className="w-10 h-10 rounded overflow-hidden">
                        <img 
                          src={product.images?.[0] ? getImageUrl(product.images[0]) : '/placeholder.svg'} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium truncate w-32">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          ₹{(product.discountPrice || product.price).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleLikePost(post._id)}
                disabled={!user}
              >
                <Heart size={16} className={hasLiked ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
                <span>{post.likes.length}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setActiveCommentPost(post._id)}
                disabled={!user}
              >
                <MessageCircle size={16} />
                <span>{post.comments.length}</span>
              </Button>
              <ShareMenu 
                postId={post._id}
                postContent={post.content}
                postImage={post.image}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleToggleSave(post._id)}
                disabled={!user}
              >
                <Bookmark 
                  size={16} 
                  className={isSaved ? 'text-brand-500 fill-brand-500' : 'text-gray-500'}
                />
              </Button>
            </div>
          </div>

          {activeCommentPost === post._id && (
            <div className="mt-3 flex gap-2">
              <Input
                id={`comment-input-${post._id}`}
                placeholder="Write a comment..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment(post._id, (e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCommentPost(null)}
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {post.comments.length > 0 && (
            <div className="mt-3 space-y-2">
              {post.comments.map((comment, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage
                      src={resolveAvatarImage(
                        comment.userImage,
                        (comment as unknown as { profilePicture?: unknown }).profilePicture,
                        (comment as unknown as { avatar?: unknown }).avatar,
                        (comment as unknown as { user?: { profilePicture?: unknown; avatar?: unknown } }).user?.profilePicture,
                        (comment as unknown as { user?: { profilePicture?: unknown; avatar?: unknown } }).user?.avatar
                      )}
                      alt={comment.userName ? `${comment.userName}'s avatar` : 'User avatar'}
                    />
                    <AvatarFallback>
                      {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{comment.userName}</p>
                    <p className="text-sm text-gray-500">{comment.content}</p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      );
    });
  };

  const ProductSelectionDialog = () => (
    <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tag Products</DialogTitle>
          <DialogDescription>
            Select products to tag in your post. Tagged products will be visible to other users and can help them discover items you're featuring.
          </DialogDescription>
        </DialogHeader>
        {isProductsLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No products available to tag</p>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product._id || product.id}
                  className="flex items-center gap-3 p-3 rounded border hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleProductTag(product._id || product.id)}
                >
                  <img
                    src={product.images?.[0] ? getImageUrl(product.images[0]) : '/placeholder.svg'}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                    loading="lazy"
                  />
                  <div className="flex-grow">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      ₹{(product.discountPrice || product.price).toFixed(2)}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTagProducts.includes(product._id || product.id)}
                      onCheckedChange={() => toggleProductTag(product._id || product.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Main render
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Community Feed</h1>
          </div>
          
          {user && (
            <Card className="mb-6 shadow-sm border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={resolveAvatarImage(user.profilePicture, (user as unknown as { avatar?: unknown }).avatar)}
                      alt={user.name ? `${user.name}'s avatar` : 'User avatar'}
                    />
                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <Textarea
                      placeholder="Share your outfit or shopping experience..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="mb-3 border-gray-300 focus:border-brand-500"
                      disabled={isLoading}
                    />
                    
                    {newPostImage && (
                      <div className="relative mb-3">
                        <img 
                          src={newPostImage} 
                          alt="Post preview" 
                          className="w-full max-h-80 object-cover rounded"
                        />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-2 right-2 w-8 h-8"
                          onClick={() => setNewPostImage(null)}
                          disabled={isLoading}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    )}
                    
                    {selectedTagProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedTagProducts.map(productId => {
                          const product = getProductInfo(productId);
                          return product ? (
                            <div 
                              key={productId}
                              className="bg-gray-100 rounded-full px-3 py-1 text-xs flex items-center gap-1"
                            >
                              <Tag size={12} />
                              <span>{product.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 ml-1"
                                onClick={() => toggleProductTag(productId)}
                                disabled={isLoading}
                              >
                                <X size={10} />
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          disabled={isLoading}
                        >
                          <label htmlFor="image-upload" className="cursor-pointer flex items-center">
                            <Image size={16} />
                            <span className="ml-1">Photo</span>
                            <input 
                              id="image-upload" 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                              disabled={isLoading}
                            />
                          </label>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={handleTagProductsClick}
                          disabled={isLoading}
                        >
                          <Tag size={16} />
                          <span>Tag Products</span>
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={handleCreatePost} 
                        className="bg-brand-600 hover:bg-brand-700"
                        disabled={isLoading || (!newPostContent.trim() && !newPostImage)}
                      >
                        {isLoading ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <TabsList className="mb-0 p-0 border-b w-full rounded-t-lg">
              <TabsTrigger value="trending" className="flex-1 py-3 data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600 rounded-tl-lg rounded-tr-none rounded-bl-none rounded-br-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600">
                Trending
              </TabsTrigger>
              <TabsTrigger value="latest" className="flex-1 py-3 data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600">
                Latest
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1 py-3 data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600 rounded-tr-lg rounded-tl-none rounded-bl-none rounded-br-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600">
                Following
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trending" className="p-6 space-y-6">
              {renderPosts(Array.isArray(posts) ? [...posts].sort((a, b) => b.likes.length - a.likes.length) : [])}
            </TabsContent>
            
            <TabsContent value="latest" className="p-6 space-y-6">
              {renderPosts(Array.isArray(posts) ? [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [])}
            </TabsContent>
            
            <TabsContent value="following" className="p-6 space-y-6">
  {user ? (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users to Follow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersToFollow.map(user => (
              <div key={user._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={resolveAvatarImage(user.avatar, (user as unknown as { profilePicture?: unknown }).profilePicture)}
                      alt={`${user.name}'s avatar`}
                    />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
                <Button 
                  variant={user.isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleFollow(user._id)}
                  disabled={isFollowingLoading}
                >
                  {user.isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Following posts section */}
      {followingPosts.length > 0 ? (
        renderPosts(followingPosts)
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">
              {hasLoadedFollowing && usersToFollow.some(u => u.isFollowing)
                ? "No posts from followed users yet" 
                : "Follow users to see their posts here"}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  ) : (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-gray-500">Please log in to see posts from users you follow.</p>
        <Button className="mt-4" onClick={() => window.location.href = '/login'}>
          Log In
        </Button>
      </CardContent>
    </Card>
  )}
  
</TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      <ProductSelectionDialog />
    </div>
  );
};

export default Community;