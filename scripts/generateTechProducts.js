const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../seed/data/techProducts.json');

const techTypes = [
    'Smart Monitor', 'Digital Thermometer', 'Sleep Tracker', 'Bottle Warmer',
    'Sterilizer', 'White Noise Machine', 'Humidifier', 'Air Purifier',
    'Scale', 'Night Light'
];

const adjectives = [
    'Pro', 'Plus', 'Ultra', 'Smart', 'Connect', 'Advanced', 'HD', 'Wi-Fi', 'Bluetooth'
];

const features = [
    'App Control', 'Night Vision', 'Instant Heat', 'Auto-Shutoff', 'Quiet Mode',
    'Voice Activation', 'Long Battery', 'Fast Charge', 'Compact', 'Travel Ready'
];

const images = [
    "https://placehold.co/600x600/f0f9ff/0284c7?text=Smart+Monitor",
    "https://placehold.co/600x600/ecfccb/65a30d?text=DreamSock",
    "https://placehold.co/600x600/fae8ff/c026d3?text=Bottle+Warmer",
    "https://placehold.co/600x600/f3f4f6/4b5563?text=White+Noise",
    "https://placehold.co/600x600/fff7ed/ea580c?text=Sterilizer",
    "https://placehold.co/600x600/f0fdf4/16a34a?text=Thermometer"
];

function generateProducts(count) {
    const products = [];
    let id = 1001; // Starting safe ID

    for (let i = 0; i < count; i++) {
        const type = techTypes[Math.floor(Math.random() * techTypes.length)];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const feat = features[Math.floor(Math.random() * features.length)];

        // Ensure uniqueness slightly
        const name = `${adj} ${type} ${Math.floor(Math.random() * 1000)}`;

        products.push({
            id: id++,
            name: name,
            description: `Experience the future of parenting with the ${name}. Featuring ${feat}, this device ensures your baby is safe and comfortable.`,
            price: Math.floor(Math.random() * 200) + 20 + 0.99,
            originalPrice: 0,
            discount: 0,
            image: images[Math.floor(Math.random() * images.length)],
            rating: (4 + Math.random()).toFixed(1),
            reviews: Math.floor(Math.random() * 500) + 10,
            category: 'Tech',
            categoryId: 'tech',
            tags: ['Tech', 'New Arrival', type.split(' ')[1] || type],
            inStock: true,
            fastDelivery: Math.random() > 0.3,
            isFeatured: Math.random() > 0.8,
            isNewArrival: Math.random() > 0.5
        });
    }

    return products;
}

const products = generateProducts(60); // Generate 60 products
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 4));
console.log(`Generated ${products.length} tech products to ${OUTPUT_FILE}`);
