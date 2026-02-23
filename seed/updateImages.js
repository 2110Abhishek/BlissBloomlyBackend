const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, 'data', 'allProducts.json');

// Map keywords to specific Item Images
const imageMap = {
    'pajamas': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80', // Sleepy baby
    'sleep suit': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80', // Sleepy baby
    'dress': 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=600&q=80', // Dress
    'romper': 'https://images.unsplash.com/photo-1522771753037-6333d791d964?auto=format&fit=crop&w=600&q=80', // Onesie
    'onesie': 'https://images.unsplash.com/photo-1522771753037-6333d791d964?auto=format&fit=crop&w=600&q=80', // Onesie
    'bodysuit': 'https://images.unsplash.com/photo-1522771753037-6333d791d964?auto=format&fit=crop&w=600&q=80', // Onesie
    't-shirt': 'https://images.unsplash.com/photo-1519238263496-63e827bdcc3f?auto=format&fit=crop&w=600&q=80', // Boy tshirt
    'shorts': 'https://images.unsplash.com/photo-1519238263496-63e827bdcc3f?auto=format&fit=crop&w=600&q=80', // Boy tshirt
    'sweater': 'https://images.unsplash.com/photo-1519238263496-63e827bdcc3f?auto=format&fit=crop&w=600&q=80', // Sweater
    'beanie': 'https://images.unsplash.com/photo-1520975954738-358643509063?auto=format&fit=crop&w=600&q=80', // Beanie
    'hat': 'https://images.unsplash.com/photo-1520975954738-358643509063?auto=format&fit=crop&w=600&q=80', // Hat
    'socks': 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80', // Socks
    'bib': 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=600&q=80', // Bib
    'swaddle': 'https://images.unsplash.com/photo-1555252333-9f8e92e65df4?auto=format&fit=crop&w=600&q=80', // Swaddle
    'wrap': 'https://images.unsplash.com/photo-1555252333-9f8e92e65df4?auto=format&fit=crop&w=600&q=80', // Swaddle
    'toy': 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80', // Toy
    'game': 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80', // Toy
    'jacket': 'https://images.unsplash.com/photo-1544126566-475a1000e15c?auto=format&fit=crop&w=600&q=80' // Jacket/Stylish
};

const defaultImage = 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80';

try {
    const raw = fs.readFileSync(PRODUCTS_JSON, 'utf-8');
    const products = JSON.parse(raw);

    let updatedCount = 0;
    const updatedProducts = products.map(p => {
        const nameLower = p.name.toLowerCase();
        let newImage = p.image;

        // Find matching keyword
        const matchedKey = Object.keys(imageMap).find(key => nameLower.includes(key));

        if (matchedKey) {
            newImage = imageMap[matchedKey];
            updatedCount++;
        }

        return {
            ...p,
            image: newImage
        };
    });

    fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(updatedProducts, null, 2));
    console.log(`Successfully updated images for ${updatedCount} products.`);

} catch (err) {
    console.error("Error updating images", err);
}
