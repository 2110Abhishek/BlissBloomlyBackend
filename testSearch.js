const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const { extractSearchAttributes } = require('./utils/searchExtractor');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/babybliss', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    const q = 'blue dress for 6 months';
    const filter = {};

    const { remainingQuery, attributes } = extractSearchAttributes(q);
    console.log('Extracted attributes:', attributes);
    console.log('Remaining query:', remainingQuery);

    if (attributes.color) {
        filter.colors = { $regex: new RegExp(`^${attributes.color}$`, 'i') };
    }

    if (attributes.ageGroup) {
        filter.ageGroups = attributes.ageGroup;
    }

    if (attributes.category) {
        const categoryRegexSearch = {
            $or: [
                { categoryId: attributes.category },
                { category: new RegExp(`^${attributes.category}$`, 'i') },
                { tags: new RegExp(attributes.category, 'i') }
            ]
        };
        filter.$or = categoryRegexSearch.$or;
    }

    console.log('MongoDB Filter:', JSON.stringify(filter, null, 2));

    const totalProducts = await Product.countDocuments(filter);
    console.log('Total matches:', totalProducts);

    process.exit();
}

test();
