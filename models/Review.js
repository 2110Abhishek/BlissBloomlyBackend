const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productId: {
        type: String, // String ID from seed data
        required: true,
        ref: 'Product'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    images: [String], // Array of image URLs
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    sentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral', 'Unanalyzed'],
        default: 'Unanalyzed'
    },
    isAbusive: {
        type: Boolean,
        default: false
    },
    isHighlighted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Review', reviewSchema);
