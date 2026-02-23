const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object }, // for url, type, etc.
    userId: { type: String, default: null }, // null = global/all users
    isRead: { type: Boolean, default: false },
    readBy: [{ type: String }], // for global notifications, track who read it
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
