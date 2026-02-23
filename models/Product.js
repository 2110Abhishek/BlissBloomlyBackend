// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true },
  name: String,
  description: String,
  price: Number,
  originalPrice: Number,
  discount: Number,
  image: String,
  images: [String], // Array of image URLs (max 5)
  rating: Number,
  reviews: Number,
  category: String,
  tags: [String],
  inStock: Boolean,
  fastDelivery: Boolean,
  categoryId: String,
  isFeatured: Boolean,
  isNewArrival: Boolean,
  userId: String, // Firebase UID of the seller

  // Seller Central Fields
  fulfillmentMethod: {
    type: String,
    enum: ['FBM', 'FBA'],
    default: 'FBM'
  },
  sku: String,
  brand: String,
  stock: {
    type: Number,
    default: 1
  },

  // Product Variants (Simple Lists for Filtering)
  sizes: [String],
  colors: [String],
  ageGroups: [String],
  packQuantities: [String],

  // Advanced Inventory (Combinations)
  variants: [{
    size: String,
    color: String,
    ageGroup: String,
    packQuantity: String,
    stock: { type: Number, default: 0 },
    price: Number, // Optional override
    sku: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
