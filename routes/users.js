const express = require('express');
const router = express.Router();
const UnblockRequest = require('../models/UnblockRequest');
const authenticate = require('../middleware/authenticate');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const logger = require('../utils/logger');

// POST /api/users/request-unblock
router.post('/request-unblock', authLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('reason').isString().trim().notEmpty().escape().withMessage('Reason is required'),
    validate
], async (req, res) => {
    const { email, reason } = req.body;

    try {
        // Check if a pending request already exists
        const existingRequest = await UnblockRequest.findOne({ email, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending request.' });
        }

        const newRequest = new UnblockRequest({
            email,
            reason
        });

        await newRequest.save();
        res.status(201).json({ message: 'Request submitted successfully. Admin will review it.' });
    } catch (error) {
        console.error('Error submitting unblock request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/wishlist
router.get('/wishlist/:uid', authenticate, async (req, res) => {
    try {
        const uid = req.user.uid;
        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid }).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.wishlist || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/users/wishlist/toggle
router.post('/wishlist/toggle', authenticate, [
    body('productId').isMongoId().withMessage('Valid Product ID is required'),
    validate
], async (req, res) => {
    try {
        const { productId } = req.body;
        const uid = req.user.uid;
        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if product exists in wishlist (handling ObjectId vs String)
        const index = user.wishlist.findIndex(id => id && id.toString() === productId);
        let action = '';

        if (index > -1) {
            // Remove
            user.wishlist.splice(index, 1);
            action = 'removed';
        } else {
            // Add
            user.wishlist.push(productId);
            action = 'added';
        }

        await user.save();

        // Return updated wishlist (populated usually better, but IDs ok for toggle response)
        // Let's return the full list ID list or just success
        res.json({ success: true, action, wishlist: user.wishlist });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/users/sync
router.post('/sync', authenticate, authLimiter, [
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('displayName').optional({ checkFalsy: true }).isString().trim().escape(),
    body('photoURL').optional({ checkFalsy: true }).isURL(),
    validate
], async (req, res) => {
    const { email, displayName, photoURL } = req.body;
    const uid = req.user.uid;
    const User = require('../models/User');

    try {
        let user = null;

        // Always try to match by email first to prevent duplicate key errors when Firebase projects change
        if (email) {
            user = await User.findOne({ email: email });
        }

        // If not found by email, try the UID
        if (!user) {
            user = await User.findOne({ firebaseUid: uid });
        }

        if (!user) {
            user = new User({
                firebaseUid: uid,
                email: email || `${uid}@noemail.com`, // Fallback for phone-auth users
                name: displayName,
                photoURL
            });
        } else {
            // Found existing user - update their Firebase UID (sync to new property if they switched projects)
            user.firebaseUid = uid;
            if (email) user.email = email; // Only update if email is provided
            user.name = displayName;
            user.photoURL = photoURL;
        }

        await user.save();
        logger.info(`Successful account sync for user: ${user.email || user.firebaseUid} (IP: ${req.ip})`);
        res.json(user);
    } catch (err) {
        logger.error(`Account sync failed: ${err.message} (IP: ${req.ip})`);
        console.error("User Sync Error", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Address Book Routes ---

// GET /api/users/address/:uid
router.get('/address/:uid', authenticate, async (req, res) => {
    try {
        const uid = req.user.uid;
        console.log(`Fetching addresses for UID: ${uid}`);
        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid });
        if (!user) {
            console.log("User not found during fetch address");
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(`Found ${user.addresses.length} addresses`);
        res.json(user.addresses || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/users/address/add
router.post('/address/add', authenticate, [
    body('address').isObject(),
    body('address.name').isString().trim().notEmpty().escape(),
    body('address.address').isString().trim().notEmpty().escape(),
    body('address.city').isString().trim().notEmpty().escape(),
    body('address.state').isString().trim().notEmpty().escape(),
    body('address.zip').isString().trim().notEmpty().escape(),
    body('address.phone').isString().trim().notEmpty().escape(),
    body('address.altPhone').optional({ checkFalsy: true }).isString().trim().escape(),
    body('address.isDefault').optional().isBoolean(),
    validate
], async (req, res) => {
    try {
        const { address } = req.body; // address is object
        const uid = req.user.uid;
        console.log(`Adding address for UID: ${uid}`, address);

        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            console.error(`User not found for UID: ${uid}`);
            return res.status(404).json({ message: 'User not found' });
        }

        // Use findOneAndUpdate to ensure atomic update and bypass potential schema compilation staleness
        const updatedUser = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { $push: { addresses: address } },
            { new: true } // Return updated document
        );

        if (!updatedUser) {
            console.error(`User not found for UID during update: ${uid}`);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log("Address saved successfully via findOneAndUpdate");
        res.json(updatedUser.addresses);
    } catch (err) {
        console.error("Error saving address:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /api/users/address/delete/:uid/:addressId
router.delete('/address/delete/:uid/:addressId', authenticate, [
    param('addressId').isMongoId().withMessage('Valid Address ID is required'),
    validate
], async (req, res) => {
    try {
        const { addressId } = req.params;
        const uid = req.user.uid;
        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.addresses = user.addresses.filter(a => a._id.toString() !== addressId);
        await user.save();
        res.json(user.addresses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/users/address/default/:uid/:addressId
router.put('/address/default/:uid/:addressId', authenticate, [
    param('addressId').isMongoId().withMessage('Valid Address ID is required'),
    validate
], async (req, res) => {
    try {
        const { addressId } = req.params;
        const uid = req.user.uid;
        const User = require('../models/User');
        const user = await User.findOne({ firebaseUid: uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.addresses.forEach(a => {
            a.isDefault = a._id.toString() === addressId;
        });

        await user.save();
        res.json(user.addresses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
