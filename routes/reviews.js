const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { analyzeReview } = require('../utils/sentimentAnalyzer');

// Helper to update product rating
const updateProductRating = async (productId) => {
    const reviews = await Review.find({ productId });
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / reviews.length;

    await Product.findOneAndUpdate(
        { id: productId },
        { rating: avgRating.toFixed(1), reviews: reviews.length }
    );
};

// GET /api/reviews/:productId
router.get('/:productId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const query = { productId: req.params.productId };

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / limit);

        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            reviews,
            currentPage: page,
            totalPages,
            totalReviews
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/reviews
router.post('/', async (req, res) => {
    try {
        const { productId, firebaseUid, rating, comment, images } = req.body;

        // Find User
        const user = await User.findOne({ firebaseUid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check Verified Purchase (Delivered Order containing verified product)
        const order = await Order.findOne({
            firebaseUid,
            status: 'Delivered',
            items: { $elemMatch: { productId: productId } }
        });

        const isVerifiedPurchase = !!order;

        // --- SENTIMENT ANALYSIS & ABUSE DETECTION ---
        const analysis = analyzeReview(comment, rating, isVerifiedPurchase);

        if (analysis.isAbusive) {
            return res.status(400).json({
                message: 'Your review contains language that violates our community guidelines and cannot be submitted.'
            });
        }

        const review = new Review({
            productId,
            userId: user._id,
            userName: user.name || 'Anonymous',
            rating,
            comment,
            images: images || [],
            isVerifiedPurchase,
            sentiment: analysis.sentiment,
            isHighlighted: analysis.isHighlighted
        });

        await review.save();

        // Update Product Stats
        await updateProductRating(productId);

        res.status(201).json(review);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
