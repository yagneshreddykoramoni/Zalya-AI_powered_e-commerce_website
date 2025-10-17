import React, { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const ProfilePicture = () => {
  const { user, updateProfilePicture } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', user.id);

    try {
      await updateProfilePicture(formData);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onClick={handleImageClick}
        className="relative cursor-pointer group"
      >
        <img
          src={user.profilePicture || '/default-avatar.png'}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-sm">Change Picture</span>
        </div>
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