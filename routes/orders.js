//routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { sendOrderConfirmation, sendOrderShippedEmail, sendOrderDeliveredEmail, sendOutForDeliveryEmail } = require('../utils/emailService');
const Razorpay = require('razorpay');

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay Keys missing!");
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const User = require('../models/User');

// Helper to update status based on time (Including Returns)
const updateOrderStatusBasedOnTime = async (order) => {
  let updated = false;
  const now = new Date();

  // --- Normal Order Flow ---
  if (order.status !== 'Delivered' && order.status !== 'Cancelled' && order.returnStatus === 'none' && order.status !== 'Return Approved') {
    const created = new Date(order.createdAt);
    const diffMinutes = (now - created) / (1000 * 60);
    const diffHours = diffMinutes / 60;

    if (order.status === 'Placed' && diffMinutes > 5) {
      order.status = 'Packed';
      order.trackingHistory.push({ status: 'Packed', description: 'Order packed and ready for shipment.', timestamp: now });
      updated = true;
    }
    else if (order.status === 'Packed' && diffHours > 24) {
      order.status = 'Shipped';
      order.trackingHistory.push({ status: 'Shipped', description: 'Order shipped via Express Logistics.', timestamp: now });
      updated = true;
      // Send Shipped Email
      sendOrderShippedEmail(order).catch(e => console.error("Failed to send shipped email", e));
    }
    else if (order.status === 'Shipped' && diffHours > 36) {
      order.status = 'Out for Delivery';
      order.trackingHistory.push({ status: 'Out for Delivery', description: 'Agent is out for delivery.', timestamp: now });
      updated = true;
      // Send Out for Delivery Email
      sendOutForDeliveryEmail(order).catch(e => console.error("Failed to send out for delivery email", e));
    }
    else if (order.status === 'Out for Delivery' && diffHours > 48) {
      order.status = 'Delivered';
      order.trackingHistory.push({ status: 'Delivered', description: 'Delivered to customer.', timestamp: now });
      updated = true;
      // Send Delivered Email
      sendOrderDeliveredEmail(order).catch(e => console.error("Failed to send delivered email", e));
    }
  }

  // --- Return Flow Automation ---
  if (order.returnStatus !== 'none' && order.returnStatus !== 'rejected' && order.returnStatus !== 'requested' && order.returnApprovedDate) {
    const approvedAt = new Date(order.returnApprovedDate);
    const diffMinutes = (now - approvedAt) / (1000 * 60);

    // 1. Pickup Scheduled (> 0.5 mins for demo)
    if (order.returnStatus === 'approved' && diffMinutes > 0.5) {
      order.returnStatus = 'pickup_scheduled';
      order.trackingHistory.push({ status: 'Pickup Scheduled', description: 'Return pickup scheduled.', timestamp: now });
      updated = true;
    }
    // 2. Out for Pickup (> 2 min)
    else if (order.returnStatus === 'pickup_scheduled' && diffMinutes > 2) {
      order.returnStatus = 'out_for_pickup';
      order.trackingHistory.push({ status: 'Out for Pickup', description: 'Agent is on the way to pick up the item.', timestamp: now });
      updated = true;
    }
    // 3. Picked Up (> 5 min)
    else if (order.returnStatus === 'out_for_pickup' && diffMinutes > 5) {
      order.returnStatus = 'picked_up';
      order.trackingHistory.push({ status: 'Picked Up', description: 'Item picked up from customer.', timestamp: now });
      updated = true;
    }
    // 4. Refund Processed (> 10 min)
    else if (order.returnStatus === 'picked_up' && diffMinutes > 10) {
      order.returnStatus = 'refunded';
      // order.refundStatus = 'completed'; 
      order.trackingHistory.push({ status: 'Refund Processed', description: 'Refund initiated to original payment source.', timestamp: now });
      updated = true;
    }
  }

  if (updated) await order.save();
  return order;
};

// create order
router.post('/', async (req, res) => {
  try {
    const { items, subtotal, shipping = 0, total, totalFormatted, customer, paymentMethod, paymentStatus, firebaseUid, paymentId } = req.body;

    // 0. Enrich items with Seller ID AND Check/Update Stock
    // We need to fetch each product to get its seller (userId) and check stock
    const enrichedItems = [];

    // Using a loop to handle async operations sequentially and allow for early exit on error
    for (const item of items) {
      const product = await require('../models/Product').findOne({ id: item.productId });

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }

      // Check Stock
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}. Only ${product.stock} left.` });
      }

      // Decrement Stock
      product.stock -= item.quantity;
      if (product.stock <= 0) {
        product.stock = 0;
        product.inStock = false;
      }
      await product.save();

      enrichedItems.push({
        ...item,
        sellerId: product.userId
      });
    }

    // 1. Find or Create User in MongoDB
    let userId = null;
    if (firebaseUid || customer.email) {
      // Try finding by UID first, then email
      let query = {};
      if (firebaseUid) query.firebaseUid = firebaseUid;
      else query.email = customer.email;

      let user = await User.findOne(query);

      if (!user && firebaseUid) {
        user = new User({
          name: customer.name,
          email: customer.email,
          firebaseUid: firebaseUid
        });
        await user.save();
      } else if (user && firebaseUid && !user.firebaseUid) {
        user.firebaseUid = firebaseUid;
        await user.save();
      }

      if (user) userId = user._id;
    }

    const order = new Order({
      items: enrichedItems,
      subtotal, shipping, total, totalFormatted, customer, paymentMethod, paymentStatus,
      firebaseUid,
      paymentId: paymentId || '', // Save Razorpay Payment ID
      userId, // Link to Mongo User
      status: 'Placed', // Initial status
      trackingHistory: [{
        status: 'Placed',
        location: 'System',
        description: 'Order placed successfully',
        timestamp: new Date()
      }]
    });

    await order.save();

    // 2. Add Order to User's history
    if (userId) {
      await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
    }

    // Send Confirmation Email (Async)
    sendOrderConfirmation(order).then(success => {
      if (success) console.log(`Order email sent to ${customer.email}`);
      else console.log(`Failed to send email to ${customer.email}`);
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get orders (for debugging/admin)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      currentPage: page,
      totalPages,
      totalOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get orders for a specific user (Buyer) with auto-update
router.get('/user/:uid', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { firebaseUid: req.params.uid };

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Auto-update status for checking
    const updatedOrders = await Promise.all(orders.map(o => updateOrderStatusBasedOnTime(o)));

    res.json({
      orders: updatedOrders,
      currentPage: page,
      totalPages,
      totalOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/seller/:uid - Get orders containing items from this seller
router.get('/seller/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { "items.sellerId": uid };

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Find orders where ANY item has this sellerId
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      currentPage: page,
      totalPages,
      totalOrders
    });
  } catch (err) {
    console.error('GET /orders/seller/:uid error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// get single order with auto-update
router.get('/:id', async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Auto-update
    order = await updateOrderStatusBasedOnTime(order);

    res.json(order);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Order not found' });
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel Order
router.put('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'pending' && order.status !== 'placed' && order.status !== 'Placed' && order.status !== 'Packed') {
      // Allow cancellation if Packed, but maybe restrict if Shipped
    }

    if (['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'cancelled';
    order.cancellationReason = req.body.reason || 'User requested cancellation';

    order.trackingHistory.push({
      status: 'Cancelled',
      location: 'System',
      description: 'Order cancelled by user',
      timestamp: new Date()
    });

    // Initiate refund if payment was online/upi/card
    if (['online', 'upi', 'card'].includes(order.paymentMethod) && order.paymentStatus === 'completed') {
      order.refundStatus = 'initiated';
      console.log(`Refund initiated for Order #${order._id}`);

      // Process Razorpay Refund
      if (order.paymentId) {
        try {
          const razorpay = getRazorpayInstance();
          if (razorpay) {
            // Amount is optional for full refund, but good practice to check
            // For now, full refund
            await razorpay.payments.refund(order.paymentId);
            console.log("Razorpay Refund Success");
            order.refundStatus = 'processed';
          }
        } catch (refundError) {
          console.error("Razorpay Refund Failed:", refundError);
          order.refundStatus = 'failed';
          // We still keep order cancelled, but refund status reflects failure
        }
      } else {
        console.warn(`Order #${order._id} has no paymentId for refund.`);
      }
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request Return (Customer)
router.put('/:id/return', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    if (order.returnStatus !== 'none') {
      return res.status(400).json({ message: 'Return already requested or processed' });
    }

    order.returnStatus = 'requested';
    order.returnReason = reason;
    order.returnDate = new Date();

    order.trackingHistory.push({
      status: 'Return Requested',
      location: 'Customer Request',
      description: `Return requested. Reason: ${reason}`,
      timestamp: new Date()
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Return Action
router.put('/:id/return-action', async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (action === 'approve') {
      order.returnStatus = 'approved';
      order.status = 'Return Approved'; // Update main status too for visibility
      order.returnApprovedDate = new Date(); // Set approval date

      order.trackingHistory.push({
        status: 'Return Approved',
        location: 'Admin',
        description: 'Return request approved. Pickup will be scheduled.',
        timestamp: new Date()
      });

    } else if (action === 'reject') {
      order.returnStatus = 'rejected';

      order.trackingHistory.push({
        status: 'Return Rejected',
        location: 'Admin',
        description: 'Return request rejected.',
        timestamp: new Date()
      });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Order Status (Tracking) - Manual Admin override
router.put('/:id/status', async (req, res) => {
  try {
    const { status, location, description } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;

    // Generate Tracking ID if not exists and status is 'Shipped'
    if (status === 'Shipped' && !order.trackingId) {
      order.trackingId = 'TRK' + Math.floor(100000 + Math.random() * 900000);
      // Set expected delivery (e.g., +5 days)
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 5);
      order.expectedDelivery = deliveryDate;
    }

    // Send Emails for Manual Updates
    if (status === 'Shipped') {
      sendOrderShippedEmail(order).catch(e => console.error("Failed to send shipped email (manual)", e));
    } else if (status === 'Out for Delivery') {
      sendOutForDeliveryEmail(order).catch(e => console.error("Failed to send out for delivery email (manual)", e));
    } else if (status === 'Delivered') {
      sendOrderDeliveredEmail(order).catch(e => console.error("Failed to send delivered email (manual)", e));
    }

    order.trackingHistory.push({
      status,
      location: location || 'Warehouse',
      description: description || `Order status updated to ${status}`,
      timestamp: new Date()
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
