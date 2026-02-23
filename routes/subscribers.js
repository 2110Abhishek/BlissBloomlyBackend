const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { sendWelcomeEmail } = require('../utils/emailService');

// POST /api/subscribers
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }

        // Check if already exists
        const existing = await Subscriber.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'This email is already subscribed!' });
        }

        // Create Subscriber
        const subscriber = new Subscriber({ email });
        await subscriber.save();

        // Send Email (Async)
        sendWelcomeEmail(email).catch(e => console.error("Welcome email failed", e));

        res.status(201).json({ message: 'Successfully subscribed! Check your inbox for a welcome gift.' });

    } catch (err) {
        console.error("Subscription Error:", err);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

module.exports = router;
