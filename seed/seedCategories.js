// seed/seedCategories.js
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blissbloomly';
const PRODUCTS_JSON = path.join(__dirname, 'data', 'allProducts.json');

const Category = require('../models/Category');

const categoryImages = {
    "Clothing": "https://cdn-icons-png.flaticon.com/512/3050/3050239.png",
    "Toys": "https://cdn-icons-png.flaticon.com/512/3082/3082060.png",
    "Feeding": "https://cdn-icons-png.flaticon.com/512/3082/3082043.png",
    "Bath & Care": "https://cdn-icons-png.flaticon.com/512/2932/2932367.png",
    "Gear": "https://cdn-icons-png.flaticon.com/512/822/822123.png",
    "Nursery": "https://cdn-icons-png.flaticon.com/512/3082/3082006.png",
    "Health & Safety": "https://cdn-icons-png.flaticon.com/512/2382/2382461.png",
    "Moms": "https://cdn-icons-png.flaticon.com/512/2921/2921226.png"
};

async function seed() {
    try {
        console.log('Connecting to MongoDB...', MONGO_URI);
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');

        if (!fs.existsSync(PRODUCTS_JSON)) {
            throw new Error(`Products JSON not found at ${PRODUCTS_JSON}`);
        }

        const raw = fs.readFileSync(PRODUCTS_JSON, 'utf-8');
        const products = JSON.parse(raw);

        if (!Array.isArray(products) || products.length === 0) {
            throw new Error('Products JSON is empty or not an array');
        }

        // Extract unique categories and count items
        const categoryMap = {};

        products.forEach(p => {
            if (p.category) {
                if (!categoryMap[p.category]) {
                    categoryMap[p.category] = { count: 0 };
                }
                categoryMap[p.category].count++;
            }
        });

        const categories = Object.keys(categoryMap).map(name => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            icon: name, // Placeholder, can be icon class name
            count: categoryMap[name].count,
            image: categoryImages[name] || "https://cdn-icons-png.flaticon.com/512/743/743007.png"
        }));

        console.log(`Found ${categories.length} categories:`, categories.map(c => c.name));

        // Remove existing
        await Category.deleteMany({});

        // Insert
        await Category.insertMany(categories);
        console.log('Categories seeded successfully');

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
