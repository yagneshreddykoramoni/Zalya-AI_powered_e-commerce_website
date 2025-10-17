import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Share2,
  MessageCircle, // WhatsApp
  Facebook,
  Twitter,
  Linkedin,
  Send, // Telegram
  Share, // Native share
} from 'lucide-react';

interface ShareMenuProps {
  postId: string;
  postContent: string;
  postImage?: string;
}

const ShareMenu: React.FC<ShareMenuProps> = ({ postId, postContent, postImage }) => {
  const handleShare = async (platform: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    const shareText = postContent.substring(0, 100) + (postContent.length > 100 ? '...' : '');
    
    const shareData = {
  title: 'Check out this post on Zalya',
      text: shareText,
      url: shareUrl,
    };

    // Try native share if available
    if (navigator.share && platform === 'native') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }

    // Platform-specific sharing URLs
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    };

    // Open share URL in new window
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-gray-100">
          <Share2 size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {navigator.share && (
          <DropdownMenuItem 
            onClick={() => handleShare('native')} 
            className="flex items-center gap-2"
          >
            <Share size={18} />
            <span>Share via...</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => handleShare('whatsapp')} 
          className="flex items-center gap-2"
        >
          <MessageCircle size={18} className="text-green-500" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('facebook')} 
          className="flex items-center gap-2"
        >
          <Facebook size={18} className="text-blue-600" />
          <span>Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('twitter')} 
          className="flex items-center gap-2"
        >
          <Twitter size={18} className="text-sky-500" />
          <span>X (Twitter)</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('linkedin')} 
          className="flex items-center gap-2"
        >
          <Linkedin size={18} className="text-blue-700" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare('telegram')} 
          className="flex items-center gap-2"
        >
          <Send size={18} className="text-sky-600" />
          <span>Telegram</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareMenu;