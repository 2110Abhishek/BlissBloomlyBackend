const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Firebase UID
    email: { type: String, required: true },

    // Registration Details
    businessName: { type: String, required: true },
    panNumber: { type: String, required: true },
    gstNumber: String,
    bankAccount: {
        accountNumber: String,
        ifscCode: String,
        bankName: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    phone: { type: String, required: true },

    // Verification Status
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: String,

    // Store Configuration
    defaultFulfillment: {
        type: String,
        enum: ['FBM', 'FBA'],
        default: 'FBM'
    },

    balance: { type: Number, default: 0 }, // For payouts

}, { timestamps: true });

module.exports = mongoose.model('Seller', sellerSchema);
