const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

// GET /api/recommendations
// Query Params:
//   uid: String (Firebase UID of the user, optional)
//   cartCategories: String (comma separated string of categories currently in cart, optional)
//   currentProductId: String (if on product detail page, optional)
router.get('/', async (req, res) => {
    try {
        const { uid, cartCategories, currentProductId } = req.query;
        let recommendedCategories = [];
        let excludeProductIds = currentProductId && mongoose.Types.ObjectId.isValid(currentProductId) ? [currentProductId] : [];
        let limit = 6;

        // 1. If user is logged in, extract categories from their past orders
        if (uid) {
            const pastOrders = await Order.find({ firebaseUid: uid }).sort({ createdAt: -1 }).limit(5);
            pastOrders.forEach(order => {
                order.items.forEach(item => {
                    if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
                        excludeProductIds.push(item.productId);
                    }
                });
            });

            // Extract categories of previously bought items:
            const pastBoughtProducts = await Product.find({ _id: { $in: excludeProductIds } });
            pastBoughtProducts.forEach(p => {
                if (p.category) recommendedCategories.push(p.category.toLowerCase());
            });
        }

        // 2. Extract categories from the current cart
        if (cartCategories) {
            const cartCats = cartCategories.split(',').map(c => c.trim().toLowerCase());
            cartCats.forEach(c => {
                if (c && !recommendedCategories.includes(c)) {
                    recommendedCategories.push(c);
                }
            });
        }

        // Deduplicate
        recommendedCategories = [...new Set(recommendedCategories)];

        // Simple Rule Engine:
        // Translate base categories into complementary categories
        let targetCategories = [];

        recommendedCategories.forEach(cat => {
            targetCategories.push(cat); // include the base category (e.g., if they like toys, show more toys)

            if (['clothing', 'boys', 'girls', 'apparel'].includes(cat)) {
                targetCategories.push('accessories', 'footwear');
            }
            if (['feeding', 'nursing'].includes(cat)) {
                targetCategories.push('bibs', 'bottles', 'pacifiers');
            }
            if (['bath & care', 'bath', 'care'].includes(cat)) {
                targetCategories.push('soaps', 'towels', 'lotions');
            }
        });

        // Unique target categories
        targetCategories = [...new Set(targetCategories)];

        // Build the MongoDB filter
        let filter = {};

        // Exclude
        if (excludeProductIds.length > 0) {
            filter._id = { $nin: excludeProductIds };
        }

        if (targetCategories.length > 0) {
            // Match target categories OR tags
            filter.$or = [
                { category: { $in: targetCategories.map(c => new RegExp(`^${c}$`, 'i')) } },
                { tags: { $in: targetCategories.map(c => new RegExp(`^${c}$`, 'i')) } }
            ];
        } else {
            // Fallback: If no history or cart context, recommend featured or trending items broadly
            filter.rating = { $gte: 4.5 }; // Top rated
        }

        // Fetch products
        let recommendations = await Product.find(filter)
            .sort({ rating: -1, reviews: -1 })
            .limit(limit);

        // If we didn't get enough recommendations, backfill with random top-rated products
        if (recommendations.length < limit) {
            const backfillLimit = limit - recommendations.length;
            const existingIds = [...excludeProductIds, ...recommendations.map(r => r._id.toString())];

            const backfill = await Product.find({
                _id: { $nin: existingIds },
                rating: { $gte: 4 }
            })
                .sort({ reviews: -1 })
                .limit(backfillLimit);

            recommendations = [...recommendations, ...backfill];
        }

        res.json(recommendations);

    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).json({ message: "Failed to fetch recommendations" });
    }
});

module.exports = router;
