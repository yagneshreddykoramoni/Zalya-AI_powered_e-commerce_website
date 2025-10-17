
import { Product, Category } from './types';

export const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Men's Clothing",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=500&auto=format&fit=crop",
    subcategories: ["T-shirts", "Shirts", "Pants", "Jackets"]
  },
  {
    id: "cat-2",
    name: "Women's Clothing",
    image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=500&auto=format&fit=crop",
    subcategories: ["Dresses", "Tops", "Skirts", "Jeans"]
  },
  {
    id: "cat-3",
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1520923642038-b4259acecbd7?q=80&w=500&auto=format&fit=crop",
    subcategories: ["Jewelry", "Bags", "Watches", "Sunglasses"]
  },
  {
    id: "cat-4",
    name: "Shoes",
    image: "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=500&auto=format&fit=crop",
    subcategories: ["Sneakers", "Boots", "Sandals", "Formal"]
  },
];

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Premium Cotton T-Shirt",
    description: "High-quality cotton t-shirt perfect for everyday wear. Comfortable, breathable, and stylish.",
    price: 29.99,
    discountPrice: 24.99,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Men's Clothing",
    subcategory: "T-shirts",
    brand: "Fashion Brand",
    rating: 4.5,
    reviewCount: 128,
    colors: ["Black", "White", "Navy", "Gray"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["cotton", "casual", "summer"],
    stock: 50,
    createdAt: "2023-01-15T08:00:00Z"
  },
  {
    id: "prod-2",
    name: "Slim Fit Jeans",
    description: "Modern slim fit jeans with stretch denim for maximum comfort. Perfect for casual and semi-formal occasions.",
    price: 59.99,
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582552938357-32b906df40cb?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Men's Clothing",
    subcategory: "Pants",
    brand: "Denim Co",
    rating: 4.3,
    reviewCount: 95,
    colors: ["Blue", "Black", "Gray"],
    sizes: ["30", "32", "34", "36"],
    tags: ["denim", "pants", "casual"],
    stock: 30,
    createdAt: "2023-01-20T10:00:00Z"
  },
  {
    id: "prod-3",
    name: "Summer Floral Dress",
    description: "Beautiful floral pattern dress perfect for summer days and special occasions.",
    price: 49.99,
    discountPrice: 39.99,
    images: [
      "https://images.unsplash.com/photo-1612722432474-b971cdcea546?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Women's Clothing",
    subcategory: "Dresses",
    brand: "Bella Fashion",
    rating: 4.7,
    reviewCount: 156,
    colors: ["Blue", "Pink", "Yellow"],
    sizes: ["XS", "S", "M", "L"],
    tags: ["summer", "floral", "dress"],
    stock: 25,
    createdAt: "2023-02-05T09:30:00Z"
  },
  {
    id: "prod-4",
    name: "Leather Crossbody Bag",
    description: "Elegant genuine leather crossbody bag with adjustable strap and multiple compartments.",
    price: 79.99,
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Accessories",
    subcategory: "Bags",
    brand: "LuxLeather",
    rating: 4.8,
    reviewCount: 87,
    colors: ["Brown", "Black", "Tan"],
    tags: ["leather", "bag", "accessory"],
    stock: 15,
    createdAt: "2023-02-15T14:00:00Z"
  },
  {
    id: "prod-5",
    name: "Running Sneakers",
    description: "Lightweight running sneakers with cushioned soles for maximum comfort during workouts.",
    price: 89.99,
    discountPrice: 69.99,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Shoes",
    subcategory: "Sneakers",
    brand: "ActiveStep",
    rating: 4.6,
    reviewCount: 203,
    colors: ["Red", "Black", "White", "Blue"],
    sizes: ["7", "8", "9", "10", "11"],
    tags: ["running", "shoes", "sports"],
    stock: 40,
    createdAt: "2023-03-01T11:00:00Z"
  },
  {
    id: "prod-6",
    name: "Classic Button-Up Shirt",
    description: "Timeless button-up shirt made from premium cotton with a comfortable regular fit.",
    price: 45.99,
    images: [
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1563630423918-b58f07336ac9?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Men's Clothing",
    subcategory: "Shirts",
    brand: "ClassicWear",
    rating: 4.4,
    reviewCount: 78,
    colors: ["White", "Light Blue", "Pink", "Striped"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    tags: ["formal", "office", "classic"],
    stock: 35,
    createdAt: "2023-03-10T15:30:00Z"
  },
  {
    id: "prod-7",
    name: "Designer Watch",
    description: "Elegant designer watch with stainless steel band and water-resistant features.",
    price: 129.99,
    images: [
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1539874754764-5a96559165b0?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Accessories",
    subcategory: "Watches",
    brand: "Timeless",
    rating: 4.9,
    reviewCount: 62,
    colors: ["Silver", "Gold", "Rose Gold"],
    tags: ["watch", "accessory", "luxury"],
    stock: 10,
    createdAt: "2023-03-20T13:00:00Z"
  },
  {
    id: "prod-8",
    name: "High-Waisted Jeans",
    description: "Fashionable high-waisted jeans that combine style and comfort for any casual occasion.",
    price: 54.99,
    images: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1475178626620-a4d074967452?q=80&w=500&auto=format&fit=crop"
    ],
    category: "Women's Clothing",
    subcategory: "Jeans",
    brand: "Denim Co",
    rating: 4.5,
    reviewCount: 114,
    colors: ["Blue", "Black", "Light Blue"],
    sizes: ["24", "26", "28", "30", "32"],
    tags: ["jeans", "casual", "women"],
    stock: 28,
    createdAt: "2023-04-05T10:00:00Z"
  },
];

export const mockFeaturedProducts = mockProducts.slice(0, 4);
export const mockNewArrivals = mockProducts.slice(4, 8);
