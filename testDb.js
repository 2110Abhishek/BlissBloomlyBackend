require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Product.findOne({ name: /dress/i });
    console.log('Dress colors:', p.colors);
    console.log('Dress ageGroups:', p.ageGroups);
    console.log('Dress sizes:', p.sizes);

    const colorsStats = await Product.distinct('colors');
    console.log('All unique colors in DB:', colorsStats);

    const ageStats = await Product.distinct('ageGroups');
    console.log('All unique age groups in DB:', ageStats);

    process.exit();
}
test();
