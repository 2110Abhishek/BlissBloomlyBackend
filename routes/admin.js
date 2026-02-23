const express = require('express');
const router = express.Router();
const admin = require('../firebaseAdmin');
const Order = require('../models/Order');
const verifyAdmin = require('../middleware/verifyAdmin');

// Protect all admin routes
router.use(verifyAdmin);

// GET /api/admin/users - List all users from Firebase
// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
    try {
        // Try to list from Firebase Admin SDK
        // This typically requires GOOGLE_APPLICATION_CREDENTIALS to be set
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users.map(userRecord => ({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            lastSignInTime: userRecord.metadata.lastSignInTime,
            creationTime: userRecord.metadata.creationTime,
            emailVerified: userRecord.emailVerified,
            disabled: userRecord.disabled
        }));

        res.json(users);
    } catch (error) {
        console.warn('Firebase listUsers failed (likely no Service Account). Fallback to Orders.', error.message);

        // Fallback: Get unique customers from Orders
        try {
            const uniqueCustomers = await Order.aggregate([
                {
                    $group: {
                        _id: "$customer.email",
                        name: { $first: "$customer.name" },
                        createdAt: { $first: "$createdAt" },
                        lastOrder: { $max: "$createdAt" }
                    }
                }
            ]);

            const users = uniqueCustomers.map(c => ({
                uid: c._id, // Use email as ID for fallback
                email: c._id,
                displayName: c.name,
                lastSignInTime: c.lastOrder,
                creationTime: c.createdAt,
                emailVerified: true // Assume verified if they ordered
            }));

            res.json(users);
        } catch (fallbackError) {
            console.error("Fallback failed", fallbackError);
            res.status(500).json({ message: 'Error fetching users' });
        }
    }
});

// GET /api/admin/orders - List all orders
router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            orders,
            currentPage: page,
            totalPages,
            totalOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

// POST /api/admin/block
router.post('/block', async (req, res) => {
    let { uid, email } = req.body;
    try {
        if (!uid && email) {
            const user = await admin.auth().getUserByEmail(email);
            uid = user.uid;
        }

        if (!uid) {
            throw new Error("UID or Email is required");
        }

        await admin.auth().updateUser(uid, { disabled: true });
        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Error blocking user: ' + error.message });
    }
});

// POST /api/admin/unblock
const UnblockRequest = require('../models/UnblockRequest');

router.post('/unblock', async (req, res) => {
    let { uid, email } = req.body;
    try {
        if (!uid && email) {
            const user = await admin.auth().getUserByEmail(email);
            uid = user.uid;
        }

        if (!uid) {
            throw new Error("UID or Email is required");
        }

        await admin.auth().updateUser(uid, { disabled: false });

        // Also resolve any pending requests for this email
        if (email) {
            await UnblockRequest.updateMany({ email, status: 'pending' }, { status: 'resolved' });
        }

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Error unblocking user: ' + error.message });
    }
});

// POST /api/admin/delete
router.post('/delete', async (req, res) => {
    let { uid, email } = req.body;
    try {
        if (!uid && email) {
            const user = await admin.auth().getUserByEmail(email);
            uid = user.uid;
        }

        if (!uid) {
            throw new Error("UID or Email is required");
        }

        await admin.auth().deleteUser(uid);

        // Also remove any unblock requests for this user
        if (email) {
            await UnblockRequest.deleteMany({ email });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user: ' + error.message });
    }
});

// GET /api/admin/requests
router.get('/requests', async (req, res) => {
    try {
        const requests = await UnblockRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Error fetching requests' });
    }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
    try {
        const totalUsers = await require('../models/User').countDocuments();
        const totalProducts = await require('../models/Product').countDocuments();

        // Aggregate Orders
        const orders = await Order.find({ status: { $nin: ['Cancelled', 'Returned'] } });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        // Sales Trend (Last 7 Days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const daysOrders = orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr);
            const daysRevenue = daysOrders.reduce((sum, o) => sum + (o.total || 0), 0);

            last7Days.push({ date: dateStr, revenue: daysRevenue, orders: daysOrders.length });
        }

        // Top Selling Products — ALL with sales data
        const productSales = {};
        orders.forEach(o => {
            o.items.forEach(item => {
                const key = item.name;
                if (!productSales[key]) {
                    productSales[key] = { name: key, qty: 0, revenue: 0, image: item.image || '' };
                }
                productSales[key].qty += item.quantity;
                productSales[key].revenue += (item.price || 0) * (item.quantity || 0);
            });
        });

        // All products sorted by units sold
        const allProductSales = Object.values(productSales)
            .sort((a, b) => b.qty - a.qty)
            .map(p => ({ ...p, revenue: parseFloat(p.revenue.toFixed(2)) }));

        const topProducts = allProductSales.slice(0, 5);

        res.json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            salesTrend: last7Days,
            topProducts,
            allProductSales
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/commission-stats - Platform Commission Overview
router.get('/commission-stats', async (req, res) => {
    try {
        const COMMISSION_RATE = 0.10;
        const Seller = require('../models/Seller');

        // All orders that have at least one seller item
        const orders = await Order.find({ 'items.sellerId': { $exists: true, $ne: null } });

        let totalSellerSales = 0;
        const sellerMap = {}; // { sellerUid: { grossSales, commissionPaid, netEarnings } }

        orders.forEach(order => {
            order.items.forEach(item => {
                if (!item.sellerId) return;
                const itemRevenue = (item.price || 0) * (item.quantity || 1);
                totalSellerSales += itemRevenue;

                if (!sellerMap[item.sellerId]) {
                    sellerMap[item.sellerId] = { grossSales: 0, commissionPaid: 0, netEarnings: 0 };
                }
                sellerMap[item.sellerId].grossSales += itemRevenue;
            });
        });

        // Calculate commission for each seller
        const sellerBreakdown = [];
        for (const [uid, data] of Object.entries(sellerMap)) {
            const commission = parseFloat((data.grossSales * COMMISSION_RATE).toFixed(2));
            const net = parseFloat((data.grossSales - commission).toFixed(2));

            // Try to get seller name
            const seller = await Seller.findOne({ userId: uid }).select('businessName email');

            sellerBreakdown.push({
                uid,
                businessName: seller?.businessName || uid,
                email: seller?.email || '',
                grossSales: parseFloat(data.grossSales.toFixed(2)),
                commissionPaid: commission,
                netEarnings: net
            });
        }

        const totalCommission = parseFloat((totalSellerSales * COMMISSION_RATE).toFixed(2));
        const totalNetPaidToSellers = parseFloat((totalSellerSales - totalCommission).toFixed(2));

        res.json({
            commissionRate: COMMISSION_RATE * 100,
            totalSellerSales: parseFloat(totalSellerSales.toFixed(2)),
            totalCommission,
            totalNetPaidToSellers,
            sellerBreakdown
        });
    } catch (error) {
        console.error('Commission Stats Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
