const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    endpoint: String,
    keys: {
        p256dh: String,
        auth: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
