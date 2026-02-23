const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, 'data', 'allProducts.json');

const updates = {
    1: "https://m.media-amazon.com/images/I/91+bswGZPOL._AC_UY1100_.jpg",
    2: "https://babiesfrock.in/cdn/shop/products/imgonline-com-ua-resize-9u51T1EhlSzHvvRe.jpg?v=1675062223",
    3: "https://m.media-amazon.com/images/I/5151puu7aVL._AC_UY1100_.jpg",
    4: "https://m.media-amazon.com/images/I/71F1kh84AtL._AC_UY1100_.jpg",
    5: "https://m.media-amazon.com/images/I/61w+ydbw5EL._AC_UY350_.jpg",
    6: "https://m.media-amazon.com/images/I/71ory-Dq7rL._AC_UY350_.jpg",
    7: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVjch3gakwiE2NqsFLAIYRtufnO9GPKmO0kA&s",
    8: "https://babynmeindia.com/cdn/shop/files/DSC9347copy.jpg?v=1760184439&width=1500",
    9: "https://www.momshome.in/cdn/shop/products/sock2_1aff645b-d084-4bfc-bd6e-47eb35a1ccf5.jpg?v=1658318113",
    10: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ3eAHZM_Waisv2WyxgeBjAnwNq_EVzxVCYQ&s"
};

try {
    const raw = fs.readFileSync(PRODUCTS_JSON, 'utf-8');
    const products = JSON.parse(raw);

    let updatedCount = 0;
    products.forEach(p => {
        if (updates[p.id]) {
            p.image = updates[p.id];
            updatedCount++;
        }
    });

    fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2));
    console.log(`Successfully restored images for ${updatedCount} products.`);

} catch (err) {
    console.error("Error fixing images", err);
}
