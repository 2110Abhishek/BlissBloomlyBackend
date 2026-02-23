const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['PERCENT', 'FLAT'],
        default: 'PERCENT'
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: null // null means unlimited
    },
    description: {
        type: String,
        default: ''
    },
    applicableCategories: {
        type: [String],
        default: [] // Empty means valid for all categories
    },
    // Deprecated but kept for backward compatibility if needed, though 'value' replaces it
    discountPercent: {
        type: Number,
        min: 0,
        max: 100
    },
    expiryDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Coupon', couponSchema);
