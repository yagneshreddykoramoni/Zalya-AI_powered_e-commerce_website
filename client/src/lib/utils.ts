import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to get the complete image URL
export function getImageUrl(imagePath: string): string {
  // If the image path is already a full URL (starts with http:// or https://), return it as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Extract the base URL without the '/api' part
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  
  // If the image path already starts with /uploads, just prepend the base URL
  if (imagePath.startsWith('/uploads')) {
    return `${baseUrl}${imagePath}`;
  }
  
  // Otherwise, construct the full path
  return `${baseUrl}/uploads/${imagePath}`;
}
