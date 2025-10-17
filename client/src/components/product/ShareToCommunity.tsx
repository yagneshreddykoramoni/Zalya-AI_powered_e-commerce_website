import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/services/communityService'; // Add this import

interface ShareToCommunityProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  tryOnImage?: string | null;
}

const ShareToCommunity: React.FC<ShareToCommunityProps> = ({ 
  product, 
  open, 
  onClose,
  tryOnImage
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');

  const handleShare = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to share to community",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Description required",
        description: "Please add a description to your post",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the community post with the product tagged
      await createPost(
        content,
        tryOnImage || undefined,
        [product._id || product.id] // Add the product ID to taggedProducts
      );

      toast({
        title: "Shared to community",
        description: "Your post has been published to the community!",
        duration: 3000,
      });

      // Close the dialog
      onClose();

      // Clear the content
      setContent('');
    } catch (error) {
      console.error('Error sharing to community:', error);
      toast({
        title: "Error sharing post",
        description: "Could not share the post to community",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share to Community</DialogTitle>
          <DialogDescription>
            Share your experience with this product to the community
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-md overflow-hidden">
              <img 
                src={tryOnImage || product.images[0]} 
                alt={product.name} 
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-gray-500">${(product.discountPrice || product.price).toFixed(2)}</p>
            </div>
          </div>
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={tryOnImage 
              ? "What do you think of this virtual try-on?"
              : `What do you love about the ${product.name}?`
            }
            className="min-h-[100px]"
          />
          
          <div className="text-sm text-gray-500">
            <p>Your post will be visible to all community members.</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="mr-2">Cancel</Button>
          <Button onClick={handleShare}>Share Now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareToCommunity;