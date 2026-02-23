const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { extractSearchAttributes } = require('../utils/searchExtractor');

// GET /api/products
// optional query: ?category=clothing
router.get('/', async (req, res) => {
  try {
    let sortOption = { rating: -1, id: 1 }; // Default to highest rated or generic sort
    const { category, q, sort, minPrice, maxPrice, rating } = req.query;
    const filter = {};

    // Category Filter
    if (category && category !== 'all') {
      if (category === 'new') {
        filter.tags = { $in: ['New Arrival'] };
        if (!sort) sortOption = { createdAt: -1, id: 1 };
      } else if (category === 'boys') {
        filter.$or = [
          { tags: { $in: ['Boy', 'Boys', 'boy', 'boys'] } },
          { name: { $regex: /boy/i } }
        ];
      } else if (category === 'girls') {
        filter.$or = [
          { tags: { $in: ['Girl', 'Girls', 'girl', 'girls'] } },
          { name: { $regex: /girl/i } }
        ];
      } else {
        filter.$or = [
          { categoryId: category },
          { category: new RegExp(`^${category}$`, 'i') }
        ];
      }
    }

    // Search Query (Smart Attribute Extraction)
    if (q) {
      // Extract smart attributes
      const { remainingQuery, attributes } = extractSearchAttributes(q);

      // Add smart filters if any attributes were extracted
      if (attributes.color) {
        // e.g. looking for "blue" in array of colors case-insensitively
        filter.colors = { $regex: new RegExp(`^${attributes.color}$`, 'i') };
      }

      if (attributes.ageGroup) {
        // e.g. exact match logic, or regex logic depending on how data is saved
        // We seeded it using precise strings like "6-12 M"
        filter.ageGroups = attributes.ageGroup;
      }

      if (attributes.category) {
        // If a category was found in the text, we query by it
        // Note: category filter might have been set explicitly from query params.
        // If so, maybe the explicit dropdown selection overrides. We'll add this to the $and category logic.
        const categoryRegexSearch = {
          $or: [
            { categoryId: attributes.category },
            { category: new RegExp(`^${attributes.category}$`, 'i') },
            { tags: new RegExp(attributes.category, 'i') }, // e.g. "romper" inside tags
            { name: new RegExp(attributes.category, 'i') }  // also search name for the extracted keyword
          ]
        };

        if (filter.$or) {
          // Wrap existing category stuff in an $and
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: filter.$or });
          filter.$and.push(categoryRegexSearch);
          delete filter.$or;
        } else if (filter.$and) {
          filter.$and.push(categoryRegexSearch);
        } else {
          filter.$or = categoryRegexSearch.$or;
        }
      }

      // Handle the remaining string as generic text search
      if (remainingQuery.trim().length > 0) {
        const qRegex = new RegExp(remainingQuery, 'i');
        const textSearchConditions = {
          $or: [
            { name: qRegex }, { description: qRegex }, { tags: qRegex }
          ]
        };

        if (filter.$or) {
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: filter.$or });
          filter.$and.push(textSearchConditions);
          delete filter.$or;
        } else if (filter.$and) {
          filter.$and.push(textSearchConditions);
        } else {
          filter.$or = textSearchConditions.$or;
        }
      }
    }

    // NEW: Price Filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // NEW: Rating Filter
    if (rating) {
      filter.rating = { $gte: Number(rating) };
    }

    // NEW: Featured Filter
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    // Sort logic
    if (sort === 'price_asc') {
      sortOption = { price: 1, id: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1, id: 1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1, id: 1 };
    } else if (sort === 'popularity') {
      sortOption = { reviews: -1, rating: -1, id: 1 };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    console.log('MongoDB Filter:', JSON.stringify(filter, null, 2));

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate Sidebar Counts (Global, not filtered)
    const [
      countAll,
      countBoys,
      countGirls,
      countClothing,
      countToys,
      countFeeding,
      countBath,
      countTech,
      countNew,
      countNursery
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ $or: [{ tags: { $in: ['Boy', 'Boys', 'boy', 'boys'] } }, { name: { $regex: /boy/i } }] }),
      Product.countDocuments({ $or: [{ tags: { $in: ['Girl', 'Girls', 'girl', 'girls'] } }, { name: { $regex: /girl/i } }] }),
      Product.countDocuments({ category: 'Clothing' }),
      Product.countDocuments({ category: 'Toys' }),
      Product.countDocuments({ category: 'Feeding' }),
      Product.countDocuments({ category: 'Bath & Care' }),
      Product.countDocuments({ category: 'Tech' }),
      Product.countDocuments({ tags: { $in: ['New Arrival'] } }),
      Product.countDocuments({ category: 'Nursery' })
    ]);

    res.json({
      products,
      currentPage: page,
      totalPages,
      totalProducts,
      categoryCounts: {
        all: countAll,
        boys: countBoys,
        girls: countGirls,
        clothing: countClothing,
        toys: countToys,
        feeding: countFeeding,
        bath: countBath,
        tech: countTech,
        new: countNew,
        nursery: countNursery
      }
    });
  } catch (err) {
    console.error('GET /api/products error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const product = await Product.findOne({ id }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('GET /api/products/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products - Create a new product
router.post('/', async (req, res) => {
  try {
    const { name, price, description, category, image, images, tags, userId, fulfillmentMethod, sku, brand, stock } = req.body;

    // Basic validation
    if (!name || !price || !category || (!image && (!images || images.length === 0))) {
      return res.status(400).json({ error: 'Please provide all required fields (at least one image)' });
    }

    // Generate new ID (Auto-increment logic)
    // Find product with max ID
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const newId = lastProduct && lastProduct.id ? lastProduct.id + 1 : 1;

    // Determine main image (legacy support)
    const mainImage = image || (images && images.length > 0 ? images[0] : '');

    const newProduct = new Product({
      id: newId,
      name,
      price: Number(price),
      description,
      category,
      image: mainImage,
      images: images || [mainImage], // Ensure array exists
      tags: tags || [], // Array of strings
      userId,
      rating: 0,
      reviews: 0,
      inStock: (Number(stock) > 0), // Auto-set
      categoryId: category, // simplistic for now

      // New Fields
      startTime: Date.now(),
      fulfillmentMethod: fulfillmentMethod || 'FBM',
      sku: sku || `SKU-${newId}`, // Auto-generate if missing
      brand: brand || 'Generic',
      stock: Number(stock) || 1,

      // Variants
      sizes: req.body.sizes || [],
      colors: req.body.colors || [],
      ageGroups: req.body.ageGroups || [],
      packQuantities: req.body.packQuantities || []
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);

  } catch (err) {
    console.error('POST /api/products error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, price, description, category, image, images, tags, fulfillmentMethod, sku, brand, stock } = req.body;

    // Find product
    const product = await Product.findOne({ id });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Update fields
    if (name) product.name = name;
    if (price) product.price = Number(price);
    if (description) product.description = description;
    if (category) product.category = category;

    // Image logic: Update both legacy and new array
    if (images && images.length > 0) {
      product.images = images;
      product.image = images[0]; // Sync main image
    } else if (image) {
      product.image = image;
      // If updating legacy image only, verify if we should push to images array or replace?
      // Logic: If user sends "image", they might be from an old client (unlikely here) or we treat it as primary.
      // Ideally we expect "images" array from the new form.
      // If only 'image' is sent, do nothing to 'images' array? Or replace [0]?
      // Let's assume the new form sends 'images'.
    }
    if (tags) product.tags = tags;
    if (fulfillmentMethod) product.fulfillmentMethod = fulfillmentMethod;
    if (sku) product.sku = sku;
    if (brand) product.brand = brand;
    if (stock !== undefined) {
      product.stock = Number(stock);
      product.inStock = Number(stock) > 0;
    }

    // Update Variants
    if (req.body.sizes) product.sizes = req.body.sizes;
    if (req.body.colors) product.colors = req.body.colors;
    if (req.body.ageGroups) product.ageGroups = req.body.ageGroups;
    if (req.body.packQuantities) product.packQuantities = req.body.packQuantities;

    const updatedProduct = await product.save();
    res.json(updatedProduct);

  } catch (err) {
    console.error('PUT /api/products/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/seller/:userId - Get all products for a specific seller
router.get('/seller/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const products = await Product.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (err) {
    console.error('Error fetching seller products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

module.exports = router;
