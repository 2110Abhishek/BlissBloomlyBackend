// utils/searchExtractor.js

const colors = [
    'red', 'blue', 'green', 'yellow', 'pink', 'white', 'black', 'grey', 'gray', 'purple', 'orange', 'brown', 'navy', 'beige', 'cream', 'mustard', 'teal', 'maroon', 'olive'
];

const categoriesMap = {
    // Clothing
    'dress': ['dress', 'frock', 'gown'],
    'romper': ['romper', 'onesie', 'bodysuit', 'jumpsuit', 'dungaree'],
    't-shirt': ['t-shirt', 'tshirt', 'shirt', 'tee', 'top'],
    'sweater': ['sweater', 'hoodie', 'sweatshirt', 'cardigan', 'pullover', 'jacket'],
    'shorts': ['shorts', 'pants', 'trousers', 'jeans', 'bottoms', 'leggings', 'joggers'],
    'sleepwear': ['pajamas', 'sleep suit', 'sleepwear', 'nightwear', 'night suit'],

    // Toys
    'toy': ['toy', 'game', 'puzzle', 'block', 'rattle', 'doll', 'car', 'train', 'bus'],

    // Nursery/Feeding/Bath
    'bib': ['bib'],
    'swaddle': ['swaddle', 'wrap', 'blanket'],
    'bottle': ['bottle', 'sippy cup'],
    'soother': ['soother', 'pacifier', 'teether'],

    // Tech
    'monitor': ['monitor', 'camera'],
    'warmer': ['warmer'],
    'sterilizer': ['sterilizer'],
    'purifier': ['purifier', 'air purifier'],
    'tracker': ['tracker', 'sleep tracker'],
    'light': ['light', 'night light'],
    'scale': ['scale', 'weighing scale'],
    'thermometer': ['thermometer'],
    'humidifier': ['humidifier'],
    'noise': ['noise', 'white noise'],
    'dreamsock': ['dreamsock', 'sock monitor']
};

const ageGroupMap = {
    '0-3 M': ['newborn', '0 months', '1 month', '2 month', '3 month', '0-3'],
    '3-6 M': ['3 months', '4 month', '5 month', '6 month', '3-6'],
    '6-12 M': ['6 months', '7 month', '8 month', '9 month', '10 month', '11 month', '12 month', '6-12', '1 year'],
    '1-2 Y': ['1 year', '12 month', '18 month', '24 month', '1-2', '2 year'],
    '2-4 Y': ['2 year', '3 year', '4 year', '2-4']
};

function extractSearchAttributes(query) {
    if (!query) return { remainingQuery: '', attributes: {} };

    let q = query.toLowerCase();
    const attributes = {};

    // 1. Extract Colors
    const extractedColors = [];
    colors.forEach(color => {
        const regex = new RegExp(`\\b${color}\\b`, 'i');
        if (regex.test(q)) {
            extractedColors.push(color);
            q = q.replace(regex, ''); // Remove from string
        }
    });
    if (extractedColors.length > 0) {
        attributes.color = extractedColors[0]; // Take the first matched color
    }

    // 2. Extract Categories
    let matchedCategory = null;
    let categoryKey = null;
    for (const [key, synonyms] of Object.entries(categoriesMap)) {
        for (const synonym of synonyms) {
            const regex = new RegExp(`\\b${synonym}\\b`, 'i');
            if (regex.test(q)) {
                matchedCategory = synonym;
                categoryKey = key;
                q = q.replace(regex, ''); // Remove from string
                break; // Stop after finding one matching synonym for this category
            }
        }
        if (matchedCategory) break; // Found a category, stop searching
    }

    if (categoryKey) {
        attributes.category = categoryKey;
    }

    // 3. Extract Age Groups
    let matchedAgeGroup = null;
    for (const [key, phrases] of Object.entries(ageGroupMap)) {
        for (const phrase of phrases) {
            // Need a more flexible regex for things like "6 months" matching "6 month" or "6 months old"
            // Let's just do a simple include or regex match
            let regexStr = `\\b${phrase.replace(' ', '\\s*')}`;
            if (phrase.includes('month') || phrase.includes('year')) {
                regexStr += `s?\\b(?:\\s*old)?`; // 'month', 'months', 'month old', 'months old'
            } else {
                regexStr += `\\b`;
            }

            const regex = new RegExp(regexStr, 'i');
            if (regex.test(q)) {
                matchedAgeGroup = key;
                q = q.replace(regex, ''); // Remove from string
                break;
            }
        }
        if (matchedAgeGroup) break;
    }

    if (matchedAgeGroup) {
        attributes.ageGroup = matchedAgeGroup;
    }

    // Clean up remaining query (remove extra spaces, 'for', 'a', etc.)
    q = q.replace(/\b(for|a|an|the|with|in)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        remainingQuery: q,
        attributes
    };
}

module.exports = { extractSearchAttributes };
