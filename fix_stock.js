const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/babybliss';

const fixStock = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");

        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        for (const p of products) {
            let updated = false;
            if (p.stock === undefined || p.stock === null) {
                console.log(`Fixing stock for ${p.name}`);
                p.stock = 10; // Default to 10 for existing items
                updated = true;
            }
            if (p.inStock === undefined) {
                p.inStock = true;
                updated = true;
            }

            if (updated) await p.save();
        }

        console.log("Stock Fix Complete");
        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

fixStock();
