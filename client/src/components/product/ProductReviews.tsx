import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import productService from '@/services/productService';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  date: Date;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface ProductReviewsProps {
  productId: string;
  initialReviews?: Review[];
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, initialReviews = [] }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsData = await productService.getProductReviews(productId);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast({
          title: "Error",
          description: "Failed to load reviews",
          variant: "destructive",
        });
        setReviews([]);
      }
    };

    if (productId) {
      fetchReviews();
    }
  }, [productId, toast]);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to submit a review",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Review required",
        description: "Please write a review comment",
        variant: "destructive",
      });
      return;
    }

    try {
      const newReview = await productService.addReview(productId, {
        rating,
        comment
      });

      setReviews([newReview, ...reviews]);
      setComment('');
      setRating(5);
      setShowReviewForm(false);

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHelpfulVote = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to vote on reviews",
      });
      return;
    }

    // Check if reviewId is valid
    if (!reviewId || reviewId === 'undefined') {
      console.error('Invalid review ID:', reviewId);
      toast({
        title: "Error",
        description: "Invalid review. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedReview = await productService.updateReviewHelpfulness(productId, reviewId, isHelpful);
      
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? updatedReview : review
        )
      );

      toast({
        title: "Vote recorded",
        description: "Thank you for your feedback",
      });
    } catch (error) {
      console.error('Error voting on review:', error);
      toast({
        title: "Error",
        description: "Failed to update review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return sum / reviews.length;
  };

  const averageRating = calculateAverageRating();

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        <div className="flex items-center">
          <div className="flex mr-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={`avg-rating-${i}`}
                size={18}
                className={`${
                  i <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
          <span className="text-gray-500 ml-2">({reviews.length} reviews)</span>
        </div>
      </div>

      {!showReviewForm && user && (
        <Button 
          onClick={() => setShowReviewForm(true)} 
          className="mb-6"
        >
          Write a Review
        </Button>
      )}

      {showReviewForm && (
        <div className="mb-10 p-6 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Write Your Review</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={`form-rating-${i}`}
                  size={24}
                  onClick={() => handleRatingChange(i)}
                  className={`${
                    i <= rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  } cursor-pointer hover:scale-110 transition-transform`}
                />
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Review</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSubmitReview}>Submit Review</Button>
            <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review, index) => (
            <div key={review.id || `review-${index}`} className="border rounded-lg p-4">
              <div className="flex justify-between">
                <div className="flex items-center mb-3">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={review.userImage} />
                    <AvatarFallback>
                      {review.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{review.userName}</p>
                    <p className="text-sm text-gray-500">{formatDate(review.date)}</p>
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={`review-${review.id}-rating-${i}`}
                      size={16}
                      className={`${
                        i <= review.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <p className="mb-4">{review.comment}</p>
              
              <div className="flex items-center justify-end gap-4 text-sm">
                <span>Was this review helpful?</span>
                <button 
                  className="flex items-center gap-1 hover:text-brand-600"
                  onClick={() => handleHelpfulVote(review.id, true)}
                  disabled={!review.id || review.id === 'undefined'}
                >
                  <ThumbsUp size={14} />
                  <span>{review.helpfulCount || 0}</span>
                </button>
                <button 
                  className="flex items-center gap-1 hover:text-red-500"
                  onClick={() => handleHelpfulVote(review.id, false)}
                  disabled={!review.id || review.id === 'undefined'}
                >
                  <ThumbsDown size={14} />
                  <span>{review.notHelpfulCount || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium mb-1">No Reviews Yet</h3>
          <p className="text-gray-500 mb-4">Be the first to review this product</p>
          {user ? (
            <Button onClick={() => setShowReviewForm(true)}>Write a Review</Button>
          ) : (
            <Link to="/login">
              <Button>Log in to Write a Review</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;