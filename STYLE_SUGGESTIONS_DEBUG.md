# Style Suggestions Feature - Debug Guide

## What We've Implemented

### Backend (`server/controllers/styleSuggestionsController.js`)
1. **Gender Detection**: Uses Groq AI + heuristic fallback to detect user gender from username
2. **Product Categorization**: Searches products by keywords:
   - **Tops**: shirt, blouse, t-shirt, tshirt, top, sweater, hoodie, jacket, blazer, coat
   - **Bottoms**: pants, jeans, jean, trouser, shorts, short, skirt, legging
   - **Accessories**: watch, belt, bag, backpack, hat, cap, scarf, sunglasses, jewelry
3. **Outfit Generation**: Creates 3 outfit combinations (1 top + 1 bottom + 1 accessory each)
4. **Caching**: Stores suggestions in User model, refreshes every 2 days
5. **Detailed Logging**: Console logs every step for debugging

### Frontend (`client/src/components/recommendations/OutfitSuggestions.tsx`)
1. **Real-time Loading**: Fetches suggestions from API on component mount
2. **Error Display**: Shows detailed error messages with product counts
3. **Refresh Button**: Allows manual refresh to generate new suggestions
4. **Product Images**: Uses `getImageUrl` utility to display product images correctly

## How to Test

### Step 1: Start the Servers
```bash
# Terminal 1 - Start backend server
cd server
npm start

# Terminal 2 - Start frontend
cd client
npm run dev
```

### Step 2: Open Browser and Check Console
1. Navigate to `http://localhost:5173` (or your Vite dev URL)
2. Login to your account
3. Go to Profile page
4. Open Browser DevTools (F12) and go to Console tab
5. Look for these logs:
   - `"Fetching style suggestions..."`
   - `"Getting style suggestions for user: [userId]"`
   - `"User found: [username]"`
   - `"Detected gender for [username]: [gender]"`
   - `"Fetching products for gender: [gender]"`
   - `"Found products - Tops: X, Bottoms: Y, Accessories: Z"`
   - `"Generated X outfits"`

### Step 3: Check for Errors

#### If you see "No outfit suggestions available"
The error message will now include debug information like:
```
Failed to load suggestions: Not enough products available...
(Tops: 0, Bottoms: 0, Accessories: 0)
Total Products: 10
Sample Categories: [...]
```

This tells you:
- How many products were found in each category
- Total products in database
- Sample product categories from your database

## Common Issues & Solutions

### Issue 1: No Products Found (Tops: 0, Bottoms: 0)
**Problem**: Your database products don't have the right category keywords.

**Example**: If your products have category = "Men's Clothing", the search won't find "shirt" in that text.

**Solution**: Update your products to include more specific keywords:
- Either in the `category` field: "Men's T-Shirt" instead of "Men's Clothing"
- Or in the `name` field: "Classic Blue T-Shirt"
- Or add `tags`: ["tshirt", "shirt", "casual", "men"]

### Issue 2: Gender Detection Not Working
**Problem**: Username doesn't match gender patterns.

**Solution**: The system falls back to "unisex" which searches all products without gender filter. This should work fine as long as products have the right category keywords.

### Issue 3: Products Don't Have Stock
**Problem**: All queries require `stock > 0`.

**Solution**: Ensure your products have `stock: 10` (or any number > 0) in the database.

## Database Requirements

Your MongoDB Product documents should ideally have:

```javascript
{
  name: "Classic Blue T-Shirt",  // Include item type here
  category: "Men's Clothing",     // Can be general
  subcategory: "T-Shirts",        // More specific
  tags: ["tshirt", "shirt", "casual", "men"],  // Keywords for search
  stock: 10,  // Must be > 0
  price: 29.99,
  images: ["image-url.jpg"],
  // ... other fields
}
```

## Testing the Fix

1. Click "Generate New" button in the Style Suggestions section
2. Check browser console for detailed logs
3. Check Network tab for the API call to `/api/style-suggestions`
4. If error, read the debug information in the error message
5. Update your products in database according to the feedback

## Next Steps

If you see an error message, please:
1. Share the exact error message from the UI
2. Share the console logs from browser
3. Share a sample product document from your MongoDB database

This will help identify the exact issue with your product data structure.

## Recommendation Metrics Monitor (Admin)

- The admin dashboard now reads live recommendation KPIs from `server/services/recommendationMetrics.js`.
- Metrics recalculate automatically after style suggestion refreshes, wishlist updates, cart mutations, and order creation.
- The REST endpoint `/api/admin/analytics/recommendations` returns the latest aggregates on demand.
- Real-time pushes are emitted over the `recommendation-metrics` Socket.IO channel; the admin UI subscribes to stay up to date without manual refreshes.
- User documents now persist outfit recommendations in a normalized format: each slot keeps `productId`, `_id`, `id`, basic pricing details, and a primary image snapshot so metrics can resolve products even if catalog entries change later.
