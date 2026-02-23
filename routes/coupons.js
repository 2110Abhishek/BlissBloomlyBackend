const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification'); // Import Notification model

// GET /api/coupons - Get all coupons (Admin)
router.get('/', async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/coupons - Create a new coupon (Admin)
router.post('/', async (req, res) => {
    const { code, type, value, minOrderValue, maxDiscount, expiryDate, usageLimit, description, applicableCategories } = req.body;

    try {
        const newCoupon = new Coupon({
            code,
            type: type || 'PERCENT',
            value: Number(value),
            minOrderValue: Number(minOrderValue) || 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            expiryDate,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            description,
            applicableCategories: applicableCategories || [],
            discountPercent: type === 'PERCENT' ? Number(value) : 0 // Fallback
        });
        const savedCoupon = await newCoupon.save();

        // Auto-Notify Users
        try {
            const notifTitle = "New Offer Available! 🎉";
            const notifBody = description || `Use code ${code} for ${type === 'PERCENT' ? value + '% OFF' : '₹' + value + ' OFF'}`;

            const notification = new Notification({
                title: notifTitle,
                body: notifBody,
                data: { type: 'coupon', code: code },
                userId: null, // Global notification
                isRead: false
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to send coupon notification", notifErr);
            // Don't fail the request if notification fails
        }

        res.status(201).json(savedCoupon);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/coupons/:id - Delete a coupon (Admin)
router.delete('/:id', async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/coupons/:id - Update a coupon (Admin)
router.put('/:id', async (req, res) => {
    const { code, type, value, minOrderValue, maxDiscount, expiryDate, usageLimit, description, isActive, applicableCategories } = req.body;

    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        if (code) coupon.code = code;
        if (type) coupon.type = type;
        if (value) coupon.value = Number(value);
        if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue);
        if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
        if (expiryDate) coupon.expiryDate = expiryDate;
        if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
        if (description) coupon.description = description;
        if (isActive !== undefined) coupon.isActive = isActive;
        if (applicableCategories) coupon.applicableCategories = applicableCategories;

        // Update deprecated field for backward compatibility
        if (type === 'PERCENT' && value) coupon.discountPercent = Number(value);

        const updatedCoupon = await coupon.save();
        res.json(updatedCoupon);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST /api/coupons/validate - Validate a coupon code (User)
router.post('/validate', async (req, res) => {
    const { code, cartTotal, cartItems } = req.body; // Expect cartTotal & cartItems for validation

    try {
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ valid: false, message: 'Coupon is inactive' });
        }

        if (new Date() > new Date(coupon.expiryDate)) {
            return res.status(400).json({ valid: false, message: 'Coupon has expired' });
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ valid: false, message: 'Coupon usage limit reached' });
        }

        // Category Validity Check
        if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
            if (!cartItems || cartItems.length === 0) {
                return res.status(400).json({ valid: false, message: 'Cart is empty' });
            }

            // Check if ANY item in cart matches ANY applicable category
            const hasEligibleItem = cartItems.some(item =>
                coupon.applicableCategories.map(c => c.toLowerCase()).includes((item.category || '').toLowerCase())
            );

            if (!hasEligibleItem) {
                return res.status(400).json({
                    valid: false,
                    message: `This coupon is valid only for: ${coupon.applicableCategories.join(', ')}`
                });
            }
        }

        // Min Order Value Check (Ideally should be based on eligible items total if category specific, but keeping simple for now)
        if (cartTotal !== undefined && cartTotal < coupon.minOrderValue) {
            return res.status(400).json({
                valid: false,
                message: `Minimum order of ₹${coupon.minOrderValue} required`
            });
        }

        // Calculate Discount Message
        let message = `${coupon.code} applied! `;
        if (coupon.type === 'FLAT') {
            message += `(₹${coupon.value} OFF)`;
        } else {
            message += `(${coupon.value}% OFF)`;
            if (coupon.maxDiscount) message += ` up to ₹${coupon.maxDiscount}`;
        }

        if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
            message += ` on ${coupon.applicableCategories.join(', ')}`;
        }

        res.json({
            valid: true,
            code: coupon.code,
            type: coupon.type || 'PERCENT',
            value: coupon.value || coupon.discountPercent, // Fallback
            minOrderValue: coupon.minOrderValue,
            maxDiscount: coupon.maxDiscount,
            applicableCategories: coupon.applicableCategories || [],
            message: message
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
