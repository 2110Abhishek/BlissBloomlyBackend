const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Middleware to verify seller (optional but recommended for security)
// For MVP, we'll just trust the uid passed in query or body

// GET /api/seller/dashboard/stats?uid=USER_ID
const COMMISSION_RATE = 0.10; // 10% to platform/admin

router.get('/stats', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'User ID required' });

        // 1. Get Total Products
        const productCount = await Product.countDocuments({ userId: uid });

        // 2. Get Seller Orders (orders containing items from this seller)
        const orders = await Order.find({ "items.sellerId": uid });

        // 3. Calculate Gross Earnings & Total Orders
        let grossEarnings = 0;
        let totalOrders = orders.length;
        let pendingOrders = 0;

        orders.forEach(order => {
            const sellerItems = order.items.filter(item => item.sellerId === uid);
            const orderTotalForSeller = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            grossEarnings += orderTotalForSeller;

            if (order.status === 'pending' || order.status === 'Processing') {
                pendingOrders++;
            }
        });

        const commissionPaid = parseFloat((grossEarnings * COMMISSION_RATE).toFixed(2));
        const netEarnings = parseFloat((grossEarnings - commissionPaid).toFixed(2));

        res.json({
            totalProducts: productCount,
            totalOrders,
            grossEarnings: parseFloat(grossEarnings.toFixed(2)),
            commissionPaid,
            netEarnings,
            commissionRate: COMMISSION_RATE * 100, // 10
            pendingOrders
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/seller/dashboard/recent-orders?uid=USER_ID
router.get('/recent-orders', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'User ID required' });

        const orders = await Order.find({ "items.sellerId": uid })
            .sort({ createdAt: -1 })
            .limit(5); // Last 5 orders

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/seller/dashboard/analytics?uid=USER_ID
router.get('/analytics', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'User ID required' });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const orders = await Order.find({
            "items.sellerId": uid,
            createdAt: { $gte: sevenDaysAgo }
        });

        const salesData = {};

        orders.forEach(order => {
            const dayName = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            const sellerItems = order.items.filter(item => item.sellerId === uid);
            const grossTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const netTotal = grossTotal * (1 - COMMISSION_RATE); // 90% net

            salesData[dayName] = (salesData[dayName] || 0) + netTotal;
        });

        const chartData = Object.keys(salesData).map(day => ({
            name: day,
            sales: parseFloat(salesData[day].toFixed(2))
        }));

        res.json(chartData);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/seller/products?uid=USER_ID (My Products)
router.get('/products', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'User ID required' });

        const products = await Product.find({ userId: uid }).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
