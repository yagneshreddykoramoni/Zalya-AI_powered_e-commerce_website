import React, { useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export const ProfilePictureUpload = () => {
  const { user, updateProfilePicture } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userId', user.id);
      await updateProfilePicture(formData);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group cursor-pointer" onClick={handleClick}>
      <Avatar className="w-24 h-24">
        <img
          src={user?.profilePicture || "/default-avatar.png"}
          alt={user?.name || "Profile"}
          className="w-full h-full object-cover rounded-full"
        />
      </Avatar>
      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <span className="text-white text-sm">
          {isLoading ? 'Uploading...' : 'Change Picture'}
        </span>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};