const fs = require('fs');
const path = require('path');

const categories = [
  'Clothing',
  'Toys',
  'Feeding',
  'Bath & Care',
  'Electronics',
  'Carriers',
  'Nursery',
  'Health & Safety'
];

const adjectives = [
  'Premium', 'Organic', 'Smart', 'Soft', 'Eco-Friendly',
  'Lightweight', 'Comfort', 'Safe', 'Deluxe', 'Cozy',
  'Gentle', 'Modern', 'Classic', 'Plush', 'Durable',
  'Hypoallergenic', 'Breathable', 'Interactive', 'Developmental'
];

const items = {
  Clothing: [
    'Onesie', 'Romper', 'T-Shirt', 'Jacket', 'Sleep Suit',
    'Bodysuit', 'Pajamas', 'Beanie', 'Socks Set', 'Bib',
    'Swaddle Wrap', 'Dress', 'Shorts', 'Sweater', 'Mittens'
  ],
  Toys: [
    'Blocks', 'Rattle', 'Puzzle', 'Play Gym', 'Musical Toy',
    'Teether', 'Plush Bear', 'Stacking Rings', 'Activity Cube', 'Bath Toy',
    'Shape Sorter', 'Doll', 'Car Set', 'Learning Tablet', 'Ball Pit'
  ],
  Feeding: [
    'Bottle', 'Feeding Set', 'Bowl', 'Spoon', 'Sterilizer',
    'High Chair', 'Sippy Cup', 'Formula Dispenser', 'Food Maker', 'Placemat',
    'Bib (Silicone)', 'Bottle Warmer', 'Snack Cup', 'Breast Pump', 'Milk Storage'
  ],
  'Bath & Care': [
    'Shampoo', 'Soap', 'Towel', 'Bath Tub', 'Care Kit',
    'Lotion', 'Oil', 'Washcloth', 'Bath Thermometer', 'Hooded Towel',
    'Potty Chair', 'Diaper Cream', 'Wipes Warmer', 'Grooming Set', 'Sponge'
  ],
  Electronics: [
    'Baby Monitor', 'Night Lamp', 'Sound Machine', 'Digital Thermometer',
    'Humidifier', 'Bottle Warmer (Electric)', 'Swing (Electric)', 'Wake-up Clock'
  ],
  Carriers: [
    'Baby Carrier', 'Wrap', 'Sling', 'Hip Seat', 'Hiking Carrier',
    'Stroller', 'Travel System', 'Diaper Bag', 'Car Seat'
  ],
  Nursery: [
    'Crib', 'Mattress', 'Storage Organizer', 'Changing Table', 'Rocking Chair',
    'Mobile', 'Playpen', 'Bedding Set', 'Blanket', 'Nightstand',
    'Wall Decor', 'Rug', 'Curtains', 'Toy Chest', 'Hamper'
  ],
  'Health & Safety': [
    'Thermometer', 'Nail Kit', 'Safety Lock', 'Corner Guards', 'Gate',
    'Monitor', 'First Aid Kit', 'Nasal Aspirator', 'Humidifier', 'Air Purifier'
  ]
};

const categoryImages = {
  Clothing: [
    'https://images.unsplash.com/photo-1588953936179-d2a4734c5490?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80', // New
    'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80'  // New
  ],
  Toys: [
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80', // New
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80'  // New
  ],
  Feeding: [
    'https://images.unsplash.com/photo-1604908554026-60f9a6c97b1b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1584859844837-7756e4090558?auto=format&fit=crop&w=600&q=80'  // New
  ],
  'Bath & Care': [
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555242304-4b5391e457f5?auto=format&fit=crop&w=600&q=80'  // New
  ],
  Electronics: [
    'https://images.unsplash.com/photo-1567589773037-034d6c8c5858?auto=format&fit=crop&w=600&q=80'
  ],
  Carriers: [
    'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506141362799-aeb0e7d5cf20?auto=format&fit=crop&w=600&q=80' // New
  ],
  Nursery: [
    'https://images.unsplash.com/photo-1586015559303-0c5c9f9b3b12?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544673894-3a719c8c5586?auto=format&fit=crop&w=600&q=80' // New
  ],
  'Health & Safety': [
    'https://images.unsplash.com/photo-1583947582886-f0b5c5b5f97f?auto=format&fit=crop&w=600&q=80'
  ]
};

let id = 1;
const products = [];

categories.forEach(category => {
  // Generate ~65 products per category to reach ~500 total
  for (let i = 0; i < 65; i++) {

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomItem = items[category][Math.floor(Math.random() * items[category].length)];
    const name = `${randomAdjective} Baby ${randomItem}`;

    const price = Number((Math.random() * 150 + 10).toFixed(2));
    const originalPrice = Number((price + Math.random() * 40).toFixed(2));
    const discount = Math.floor(((originalPrice - price) / originalPrice) * 100);

    // Feature Flags
    const isFeatured = Math.random() > 0.90; // Top 10%
    const isNewArrival = Math.random() > 0.85; // Top 15%

    // Gender tagging
    const tags = [category];
    if (isNewArrival) tags.push('New Arrival');

    // Randomly assign gender tags for clothing/toys etc, or generic for others
    const genderRoll = Math.random();
    if (genderRoll < 0.3) tags.push('Boy', 'Boys');
    else if (genderRoll < 0.6) tags.push('Girl', 'Girls');
    else tags.push('Unisex');

    // Image
    const catImages = categoryImages[category];
    const image = catImages[Math.floor(Math.random() * catImages.length)];

    products.push({
      id: id++,
      name,
      description: `Description for ${name}. High quality ${category.toLowerCase()} product designed for modern parents.`,
      price,
      originalPrice,
      discount,
      image,
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
      reviews: Math.floor(Math.random() * 500),
      category,
      tags,
      inStock: Math.random() > 0.1, // 90% in stock
      fastDelivery: Math.random() > 0.4,

      isFeatured,
      isNewArrival,
      createdAt: new Date()
    });
  }
});


fs.writeFileSync(
  path.join(__dirname, 'allProducts.json'),
  JSON.stringify(products, null, 2)
);

console.log(`✅ Generated ${products.length} products`);
