const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
// NOTE: Keys should be in .env
// Initialize Razorpay Helper
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID.includes('YOUR_')) {
        throw new Error("Razorpay Keys are missing in .env");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Get Public Key
router.get('/key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// Create Order (Initiates Payment)
router.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body; // Expect amount in INR (whole number)

        // Amount must be in paise (multiply by 100)
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: "order_rcptid_" + Date.now()
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Payment Signature
router.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Verify signature using Secret
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        res.json({ success: true, message: "Payment verified" });
    } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
});

module.exports = router;
