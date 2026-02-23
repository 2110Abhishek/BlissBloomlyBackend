const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Subscription = require('../models/Subscription');

// Generated VAPID Keys
const publicVapidKey = 'BOIjVJ4YzjQb3lxyEiosjABJnfdtyfwpzuof4XZW1UbtZpDynfigAHAXP2TzLMd6iFNkFpOALvYGGhV_9q5Evus';
const privateVapidKey = 'u2HaBkmpf2Py7jMLS2g_aDkyK4sAPM_f5dpAAvgMUxE';

webpush.setVapidDetails(
    'mailto:admin@blissbloomly.com',
    publicVapidKey,
    privateVapidKey
);

const Notification = require('../models/Notification');

// Subscribe Route
router.post('/subscribe', async (req, res) => {
    const subscription = req.body;
    try {
        const exists = await Subscription.findOne({ endpoint: subscription.endpoint });
        if (!exists) {
            await Subscription.create(subscription);
        }
        res.status(201).json({});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Admin Send Notification Route
router.post('/send', async (req, res) => {
    const { title, body, url } = req.body;
    const payload = JSON.stringify({
        title,
        body,
        data: { url: url || '/' }
    });

    try {
        // 1. Save to Database (Global Notification)
        const notification = await Notification.create({
            title,
            body,
            data: { url: url || '/' },
            userId: null // Global
        });

        // 2. Send Web Push
        const subscriptions = await Subscription.find();
        console.log(`Sending notification to ${subscriptions.length} subscribers`);

        const promises = subscriptions.map(sub =>
            webpush.sendNotification(sub, payload).catch(err => {
                if (err.statusCode === 410) {
                    // Subscription expired/gone
                    return Subscription.deleteOne({ _id: sub._id });
                }
                console.error('Error sending to sub', err);
            })
        );

        await Promise.all(promises);
        res.json({ success: true, count: subscriptions.length, notification });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

// Get Notifications for a User
router.get('/user/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        // Get global notifications OR notifications specific to this user
        // Sort by newest first
        const notifications = await Notification.find({
            $or: [
                { userId: null },
                { userId: uid }
            ]
        }).sort({ createdAt: -1 }).limit(20);

        // Add a virtual 'isRead' for global notifications based on readBy array
        const result = notifications.map(n => {
            const doc = n.toObject();
            if (n.userId === null) {
                doc.isRead = n.readBy.includes(uid);
            }
            return doc;
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark Notification as Read
router.put('/:id/read', async (req, res) => {
    try {
        const { uid } = req.body; // User ID reading it
        if (!uid) return res.status(400).json({ error: 'User ID required' });

        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        if (notification.userId === null) {
            // Global notification: add to readBy if not present
            if (!notification.readBy.includes(uid)) {
                notification.readBy.push(uid);
                await notification.save();
            }
        } else {
            // Personal notification
            notification.isRead = true;
            await notification.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

module.exports = router;
