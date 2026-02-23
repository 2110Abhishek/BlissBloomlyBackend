const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');

// GET /api/sellers - Get all sellers (with optional status filter)
// GET /api/sellers - Get all sellers (with optional status filter)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query; // ?status=pending or ?status=approved
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) {
            query.verificationStatus = status;
        }

        const totalSellers = await Seller.countDocuments(query);
        const totalPages = Math.ceil(totalSellers / limit);

        const sellers = await Seller.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            sellers,
            currentPage: page,
            totalPages,
            totalSellers
        });
    } catch (err) {
        console.error('GET /sellers error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/sellers/me - Check if current user is a seller
router.get('/me', async (req, res) => {
    try {
        // We expect uid to be passed in query or header for now (MVP)
        // Ideally should come from middleware after token verification
        const { uid } = req.query;

        if (!uid) {
            return res.status(400).json({ error: 'User ID required' });
        }

        const seller = await Seller.findOne({ userId: uid });
        if (!seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        res.json(seller);
    } catch (err) {
        console.error('GET /sellers/me error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/sellers/register - Register as a new seller
router.post('/register', async (req, res) => {
    try {
        const { userId, email, businessName, panNumber, gstNumber, bankAccount, address, phone } = req.body;

        if (!userId || !email || !businessName || !panNumber || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingSeller = await Seller.findOne({ userId });
        if (existingSeller) {
            return res.status(400).json({ error: 'Seller application already exists for this user.' });
        }

        const newSeller = new Seller({
            userId,
            email,
            businessName,
            panNumber,
            gstNumber,
            bankAccount, // Expect object { accountNumber, ifscCode, bankName }
            address,     // Expect object { street, city, state, zip, country }
            phone,
            isVerified: false, // Always false initially, requires Admin Approval
            verificationStatus: 'pending'
        });

        await newSeller.save();
        res.status(201).json(newSeller);

    } catch (err) {
        console.error('POST /sellers/register error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/sellers/:id/approve - Admin approves seller
// Note: In real app, secure this with Admin Middleware
router.put('/:id/approve', async (req, res) => {
    try {
        const sellerId = req.params.id;
        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { isVerified: true, verificationStatus: 'approved' },
            { new: true }
        );
        res.json(seller);
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve seller' });
    }
});

// GET /api/sellers/pending - Admin fetches pending sellers
router.get('/pending', async (req, res) => {
    try {
        const users = await Seller.find({ verificationStatus: 'pending' });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pending sellers' });
    }
});

// PUT /api/sellers/:id/block - Admin blocks seller
router.put('/:id/block', async (req, res) => {
    try {
        const sellerId = req.params.id;
        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { isVerified: false, verificationStatus: 'blocked' },
            { new: true }
        );
        res.json(seller);
    } catch (err) {
        res.status(500).json({ error: 'Failed to block seller' });
    }
});

// DELETE /api/sellers/:id - Admin deletes seller
router.delete('/:id', async (req, res) => {
    try {
        const sellerId = req.params.id;
        await Seller.findByIdAndDelete(sellerId);
        res.json({ message: 'Seller deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete seller' });
    }
});

module.exports = router;
