// seed/seedProducts.js
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blissbloomly';
const PRODUCTS_JSON = path.join(__dirname, 'data', 'allProducts.json');

const Product = require('../models/Product');

async function seed() {
  try {
    console.log('Connecting to MongoDB...', MONGO_URI);
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    if (!fs.existsSync(PRODUCTS_JSON)) {
      throw new Error(`Products JSON not found at ${PRODUCTS_JSON}`);
    }

    const raw = fs.readFileSync(PRODUCTS_JSON, 'utf-8');
    const existingProducts = JSON.parse(raw);

    const products = [...existingProducts];

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Products JSON is empty or not an array');
    }

    console.log(`Seeding ${products.length} products...`);

    // Inject Variants for Testing
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'White', 'Black'];
    const ages = ['0-3 M', '3-6 M', '6-12 M', '1-2 Y', '2-4 Y'];
    const packs = ['1 Pack', 'Set of 2', 'Set of 3', 'Bundle'];

    // Helper to pick random n items but keep them sorted based on original order
    const pickSorted = (arr, n) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
      return shuffled.sort((a, b) => arr.indexOf(a) - arr.indexOf(b));
    };

    const productsWithVariants = products.map(p => {
      // Randomly assign variants based on category
      const isClothing = ['Clothing', 'Boys', 'Girls', 'New Arrivals'].includes(p.category);

      const hasSize = isClothing && Math.random() > 0.1;
      const hasColor = Math.random() > 0.3;
      const hasAge = isClothing;
      const hasPack = !isClothing && Math.random() > 0.7;

      const selectedSizes = hasSize ? pickSorted(sizes, 3) : [];
      const selectedColors = hasColor ? pickSorted(colors, 3) : [];
      const selectedAges = hasAge ? pickSorted(ages, 3) : [];
      const selectedPacks = hasPack ? pickSorted(packs, 2) : [];

      let variants = [];

      // Generate Combinations based on selected attributes
      if (selectedSizes.length > 0 || selectedColors.length > 0 || selectedAges.length > 0) {
        // Flatten combinations (Cartesian Productish)
        // For simplicity, let's mix them. 
        // If Size & Color & Age exist: Size x Color x Age
        // If just Size & Color: Size x Color

        const loopSizes = selectedSizes.length ? selectedSizes : [undefined];
        const loopColors = selectedColors.length ? selectedColors : [undefined];
        const loopAges = selectedAges.length ? selectedAges : [undefined];

        loopSizes.forEach(s => {
          loopColors.forEach(c => {
            loopAges.forEach(a => {
              variants.push({
                size: s,
                color: c,
                ageGroup: a,
                stock: Math.floor(Math.random() * 20) + 5 // 5-25 stock per variant
              });
            });
          });
        });
      } else if (selectedPacks.length > 0) {
        selectedPacks.forEach(p => {
          variants.push({
            packQuantity: p,
            stock: Math.floor(Math.random() * 20) + 5
          });
        });
      }

      // Calculate total stock
      const totalStock = variants.length > 0
        ? variants.reduce((acc, v) => acc + v.stock, 0)
        : Math.floor(Math.random() * 50) + 15; // Fallback for no variants

      return {
        ...p,
        stock: totalStock,
        variants: variants,
        // Keep top-level arrays for filtering convenience
        sizes: selectedSizes,
        colors: selectedColors,
        ageGroups: selectedAges,
        packQuantities: selectedPacks,
        categoryId: (() => {
          if (p.category === 'Bath & Care') return 'bath';
          if (p.category === 'New Arrivals') return 'new';
          return p.category.toLowerCase();
        })()
      };
    });

    // Remove existing
    console.log('Clearing existing products...');
    await Product.deleteMany({});

    // Insert
    console.log(`Inserting ${productsWithVariants.length} products...`);
    // Validate objects
    productsWithVariants.forEach((p, i) => {
      if (!p.name) console.warn(`Product at index ${i} missing name`);
    });

    await Product.insertMany(productsWithVariants);
    console.log('Products seeded successfully');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
