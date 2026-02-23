const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    firebaseUid: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    addresses: [{
        name: String,
        address: String,
        city: String,
        state: String,
        zip: String,
        phone: String,
        altPhone: String,
        isDefault: { type: Boolean, default: false }
    }]
});

module.exports = mongoose.model('User', userSchema);
