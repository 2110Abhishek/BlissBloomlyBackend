const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const path = require('path');
const fs = require('fs');

dotenv.config();

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected for Seeding');

        // Load products from JSON file
        const productsPath = path.join(__dirname, 'seed', 'data', 'allProducts.json');
        const productsData = fs.readFileSync(productsPath, 'utf-8');
        const products = JSON.parse(productsData);

        console.log(`Found ${products.length} products to seed.`);

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        await Product.insertMany(products);
        console.log('Data Imported!');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
