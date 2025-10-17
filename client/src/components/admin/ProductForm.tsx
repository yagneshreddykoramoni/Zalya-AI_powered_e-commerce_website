import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Image, ChevronDown } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

// Define validation schema for the product form
const productFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  discountPrice: z.coerce.number().positive("Discount price must be a positive number").optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  brand: z.string().min(1, "Brand is required"),
  stock: z.coerce.number().nonnegative("Stock must be a non-negative number"),
  rating: z.string().optional(),
  reviewCount: z.coerce.number().nonnegative().optional(),
  tags: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  styleType: z.string().optional(),
  occasion: z.array(z.string()).optional(),
  season: z.array(z.string()).optional(),
  fitType: z.string().optional(),
  material: z.string().optional(),
});

// Predefined options
const categoryOptions = [
  'Accessories',
  'Footwear',
  'Men\'s Clothing',
  'Women\'s Clothing'
];

const subcategoryOptions = {
  'Accessories': ['Bags', 'Jewelry', 'Sunglasses', 'Watches'],
  'Footwear': ['Athletic shoes', 'Casual shoes', 'Formal shoes', 'Sandals'],
  'Men\'s Clothing': ['Jackets', 'Pants', 'Shirts', 'T-shirts'],
  'Women\'s Clothing': ['Dresses', 'Jeans', 'Skirts', 'Tops']
};

const ratingOptions = [
  { value: '5', label: '5 Stars' },
  { value: '4.5', label: '4.5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3.5', label: '3.5 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2.5', label: '2.5 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1.5', label: '1.5 Stars' },
  { value: '1', label: '1 Star' },
];

const colorOptions = [
  'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 
  'Black', 'White', 'Gray', 'Navy', 'Beige', 'Cream', 'Maroon', 'Teal'
];

const sizeOptions = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 
  '28', '30', '32', '34', '36', '38', '40', '42', '44',
  'One Size'
];

const styleTypeOptions = [
  'Casual', 'Formal', 'Party/Evening', 'Sport/Active', 'Business', 'Vintage'
];

const occasionOptions = [
  'Everyday', 'Work/Office', 'Weekend', 'Date Night', 'Party', 'Gym/Sports'
];

const seasonOptions = [
  'Spring/Summer', 'Fall/Winter', 'All Season'
];

const fitTypeOptions = [
  'Slim Fit', 'Regular Fit', 'Loose/Relaxed', 'Oversized'
];

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { toast } = useToast();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(initialData?.images || ['']);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resolvePreviewUrl = (url: string) => {
    if (!url) {
      return '';
    }

    if (url.startsWith('data:')) {
      return url;
    }

    return getImageUrl(url);
  };
  
  // State for multi-select dropdowns
  const [selectedColors, setSelectedColors] = useState<string[]>(initialData?.colors || []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialData?.sizes || []);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialData?.category || '');
  const [selectedOccasion, setSelectedOccasion] = useState<string[]>(initialData?.occasion || []);
  const [selectedSeason, setSelectedSeason] = useState<string[]>(initialData?.season || []);

  // Helper functions for multi-select dropdowns
  const toggleColorSelection = (color: string) => {
    setSelectedColors(prev => {
      const newColors = prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color];
      form.setValue('colors', newColors);
      return newColors;
    });
  };

  const toggleSizeSelection = (size: string) => {
    setSelectedSizes(prev => {
      const newSizes = prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size];
      form.setValue('sizes', newSizes);
      return newSizes;
    });
  };

  const toggleOccasionSelection = (occasion: string) => {
    setSelectedOccasion(prev => {
      const newOccasions = prev.includes(occasion) 
        ? prev.filter(o => o !== occasion)
        : [...prev, occasion];
      form.setValue('occasion', newOccasions);
      return newOccasions;
    });
  };

  const toggleSeasonSelection = (season: string) => {
    setSelectedSeason(prev => {
      const newSeasons = prev.includes(season) 
        ? prev.filter(s => s !== season)
        : [...prev, season];
      form.setValue('season', newSeasons);
      return newSeasons;
    });
  };

  // Initialize the form with default values or existing product data
  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      discountPrice: initialData?.discountPrice || undefined,
      category: initialData?.category || '',
      subcategory: initialData?.subcategory || '',
      brand: initialData?.brand || '',
      stock: initialData?.stock || 0,
      rating: initialData?.rating ? String(initialData.rating) : '',
      reviewCount: initialData?.reviewCount || 0,
      tags: initialData?.tags?.join(', ') || '',
      sizes: initialData?.sizes || [],
      colors: initialData?.colors || [],
      styleType: initialData?.styleType || '',
      occasion: initialData?.occasion || [],
      season: initialData?.season || [],
      fitType: initialData?.fitType || '',
      material: initialData?.material || '',
    },
  });

  const handleImageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImageFiles = [...imageFiles];
      newImageFiles[index] = file;
      setImageFiles(newImageFiles);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviewUrls = [...imagePreviewUrls];
        newPreviewUrls[index] = reader.result as string;
        setImagePreviewUrls(newPreviewUrls);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const addImageField = () => {
    setImagePreviewUrls([...imagePreviewUrls, '']);
    // Ensure the refs array is updated
    fileInputRefs.current = fileInputRefs.current.concat(null);
  };

  const removeImageField = (index: number) => {
    const newPreviewUrls = [...imagePreviewUrls];
    newPreviewUrls.splice(index, 1);
    setImagePreviewUrls(newPreviewUrls);
    
    const newImageFiles = [...imageFiles];
    newImageFiles.splice(index, 1);
    setImageFiles(newImageFiles);
    
    // Update refs array
    fileInputRefs.current = fileInputRefs.current.filter((_, i) => i !== index);
  };

  const handleFormSubmit = (data: z.infer<typeof productFormSchema>) => {
    // Check if we have at least one image
    if (imagePreviewUrls.length === 0 || !imagePreviewUrls.some(img => img.trim() !== '')) {
      toast({
        title: "Validation Error",
        description: "At least one image is required",
        variant: "destructive",
      });
      return;
    }

    // Create FormData object to handle file uploads
    const formData = new FormData();
    
    // Add all the form fields except arrays (we'll handle arrays separately)
    const excludeFields = ['tags', 'colors', 'sizes', 'occasion', 'season'];
    Object.keys(data).forEach(key => {
      if (!excludeFields.includes(key)) {
        const value = data[key as keyof typeof data];
        if (value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      }
    });
    
    // Convert comma-separated strings to arrays and add to formData
    if (data.tags) {
      const tagsArray = data.tags.split(',').map((tag: string) => tag.trim());
      formData.append('tags', JSON.stringify(tagsArray));
    }
    
    // Add selected colors and sizes as arrays
    if (selectedColors.length > 0) {
      formData.append('colors', JSON.stringify(selectedColors));
    }
    
    if (selectedSizes.length > 0) {
      formData.append('sizes', JSON.stringify(selectedSizes));
    }

    if (selectedOccasion.length > 0) {
      formData.append('occasion', JSON.stringify(selectedOccasion));
    }

    if (selectedSeason.length > 0) {
      formData.append('season', JSON.stringify(selectedSeason));
    }
    
    // Add existing images that weren't changed (URLs)
    const existingImages = imagePreviewUrls.filter(url => url.startsWith('http') || url.startsWith('/uploads'));
    if (existingImages.length > 0) {
      formData.append('existingImages', JSON.stringify(existingImages));
    }
    
    // Add new image files
    imageFiles.forEach((file) => {
      if (file) {
        formData.append('productImages', file);
      }
    });
    
    // Add product ID and creation date if editing
    if (initialData?.id) {
      formData.append('id', initialData.id);
    }
    if (initialData?.createdAt) {
      formData.append('createdAt', initialData.createdAt);
    }
    
    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed product description" 
                      className="min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Price Information */}
          <div>
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="discountPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Price (₹) (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="Leave blank if no discount"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be less than the regular price
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Category Information */}
          <div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCategory(value);
                      // Reset subcategory when category changes
                      form.setValue('subcategory', '');
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedCategory && subcategoryOptions[selectedCategory as keyof typeof subcategoryOptions]?.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Brand and Stock */}
          <div>
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brand name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Rating Information */}
          <div>
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ratingOptions.map((rating) => (
                        <SelectItem key={rating.value} value={rating.value}>
                          {rating.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="reviewCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Reviews (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Colors, Sizes and Tags */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="colors"
              render={() => (
                <FormItem>
                  <FormLabel>Available Colors (Optional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedColors.length > 0
                            ? `${selectedColors.length} color${selectedColors.length > 1 ? 's' : ''} selected`
                            : "Select colors"
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Available Colors</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {colorOptions.map((color) => (
                        <DropdownMenuCheckboxItem
                          key={color}
                          checked={selectedColors.includes(color)}
                          onCheckedChange={() => toggleColorSelection(color)}
                        >
                          {color}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormDescription>
                    Select multiple colors that are available for this product
                  </FormDescription>
                  {selectedColors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedColors.map((color) => (
                        <div
                          key={color}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => toggleColorSelection(color)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="sizes"
              render={() => (
                <FormItem>
                  <FormLabel>Available Sizes (Optional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedSizes.length > 0
                            ? `${selectedSizes.length} size${selectedSizes.length > 1 ? 's' : ''} selected`
                            : "Select sizes"
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Available Sizes</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {sizeOptions.map((size) => (
                        <DropdownMenuCheckboxItem
                          key={size}
                          checked={selectedSizes.includes(size)}
                          onCheckedChange={() => toggleSizeSelection(size)}
                        >
                          {size}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormDescription>
                    Select multiple sizes that are available for this product
                  </FormDescription>
                  {selectedSizes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSizes.map((size) => (
                        <div
                          key={size}
                          className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {size}
                          <button
                            type="button"
                            onClick={() => toggleSizeSelection(size)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Comma-separated list e.g., bestseller, new-arrival, sale" 
                    />
                  </FormControl>
                  <FormDescription>
                    Enter tags separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Style Type */}
          <div>
            <FormField
              control={form.control}
              name="styleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Style Type (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {styleTypeOptions.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Fit Type */}
          <div>
            <FormField
              control={form.control}
              name="fitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fit Type (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fitTypeOptions.map((fit) => (
                        <SelectItem key={fit} value={fit}>
                          {fit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Occasion */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="occasion"
              render={() => (
                <FormItem>
                  <FormLabel>Occasion (Optional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedOccasion.length > 0
                            ? `${selectedOccasion.length} occasion${selectedOccasion.length > 1 ? 's' : ''} selected`
                            : "Select occasions"
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Suitable Occasions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {occasionOptions.map((occasion) => (
                        <DropdownMenuCheckboxItem
                          key={occasion}
                          checked={selectedOccasion.includes(occasion)}
                          onCheckedChange={() => toggleOccasionSelection(occasion)}
                        >
                          {occasion}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormDescription>
                    Select occasions where this product would be suitable
                  </FormDescription>
                  {selectedOccasion.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedOccasion.map((occasion) => (
                        <div
                          key={occasion}
                          className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {occasion}
                          <button
                            type="button"
                            onClick={() => toggleOccasionSelection(occasion)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Season */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="season"
              render={() => (
                <FormItem>
                  <FormLabel>Season (Optional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedSeason.length > 0
                            ? `${selectedSeason.length} season${selectedSeason.length > 1 ? 's' : ''} selected`
                            : "Select seasons"
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Suitable Seasons</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {seasonOptions.map((season) => (
                        <DropdownMenuCheckboxItem
                          key={season}
                          checked={selectedSeason.includes(season)}
                          onCheckedChange={() => toggleSeasonSelection(season)}
                        >
                          {season}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormDescription>
                    Select seasons when this product is most suitable
                  </FormDescription>
                  {selectedSeason.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSeason.map((season) => (
                        <div
                          key={season}
                          className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {season}
                          <button
                            type="button"
                            onClick={() => toggleSeasonSelection(season)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Material */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Cotton, Denim, Silk, Polyester, Leather" 
                    />
                  </FormControl>
                  <FormDescription>
                    Specify the primary material composition
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Product Images */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Product Images</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addImageField}
                >
                  Add Image
                </Button>
              </div>
              
              {imagePreviewUrls.map((previewUrl, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-20 border-dashed flex flex-col items-center justify-center gap-1"
                      onClick={() => triggerFileInput(index)}
                    >
                      <Image size={24} />
                      {previewUrl ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(index, e)}
                      ref={el => fileInputRefs.current[index] = el}
                      style={{ display: 'none' }}
                    />
                    {imagePreviewUrls.length > 1 && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeImageField(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {previewUrl && (
                    <div className="relative h-40 w-full overflow-hidden rounded-md border">
                      <img 
                        src={resolvePreviewUrl(previewUrl)} 
                        alt={`Product preview ${index + 1}`} 
                        className="h-full w-full object-contain" 
                      />
                    </div>
                  )}
                </div>
              ))}
              <FormDescription>
                Upload product images. At least one image is required.
              </FormDescription>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
