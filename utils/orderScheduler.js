const mongoose = require('mongoose');
const Order = require('../models/Order');
const { sendOrderShippedEmail, sendOrderDeliveredEmail, sendOutForDeliveryEmail } = require('./emailService');

const startOrderScheduler = () => {
    console.log('Starting Order Status Scheduler...');

    // Run every 60 seconds
    setInterval(async () => {
        // Skip run if database is not connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Order Scheduler: Skipping run, database not connected.');
            return;
        }

        try {
            const now = new Date();

            // 1. Placed -> Processing (After 5 minutes)
            const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
            await Order.updateMany(
                {
                    status: 'Placed',
                    createdAt: { $lte: fiveMinsAgo }
                },
                {
                    $set: { status: 'Processing' },
                    $push: {
                        trackingHistory: {
                            status: 'Processing',
                            location: 'Warehouse',
                            timestamp: now,
                            description: 'Order is being processed by the seller.'
                        }
                    }
                }
            );

            // 2. Processing -> Packed (After 30 minutes)
            const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
            await Order.updateMany(
                {
                    status: 'Processing',
                    createdAt: { $lte: thirtyMinsAgo }
                },
                {
                    $set: { status: 'Packed' },
                    $push: {
                        trackingHistory: {
                            status: 'Packed',
                            location: 'Warehouse',
                            timestamp: now,
                            description: 'Order has been packed and is ready for dispatch.'
                        }
                    }
                }
            );

            // 3. Packed -> Shipped (After 2 hours)
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const packedOrders = await Order.find({
                status: 'Packed',
                createdAt: { $lte: twoHoursAgo }
            });

            for (const order of packedOrders) {
                order.status = 'Shipped';
                // Generate tracking ID if missing
                if (!order.trackingId) {
                    order.trackingId = 'TRK' + Math.floor(100000 + Math.random() * 900000);
                    const deliveryDate = new Date();
                    deliveryDate.setDate(deliveryDate.getDate() + 5);
                    order.expectedDelivery = deliveryDate;
                }
                order.trackingHistory.push({
                    status: 'Shipped',
                    location: 'Dispatch Center',
                    timestamp: now,
                    description: 'Order has been shipped.'
                });
                await order.save();
                // Send Email
                sendOrderShippedEmail(order).catch(e => console.error("Scheduler: Failed to send shipped email", e));
            }

            // 4. Shipped -> Out for Delivery & Out for Delivery -> Delivered
            const activeOrders = await Order.find({
                status: { $in: ['Shipped', 'Out for Delivery'] }
            });

            for (const order of activeOrders) {
                const orderDate = new Date(order.createdAt);
                const nextDay = new Date(orderDate);
                nextDay.setDate(orderDate.getDate() + 1);
                nextDay.setHours(9, 0, 0, 0); // 9 AM next day

                const nextDayEvening = new Date(orderDate);
                nextDayEvening.setDate(orderDate.getDate() + 1);
                nextDayEvening.setHours(18, 0, 0, 0); // 6 PM next day

                // Shipped -> Out for Delivery
                if (order.status === 'Shipped' && now >= nextDay) {
                    order.status = 'Out for Delivery';
                    order.trackingHistory.push({
                        status: 'Out for Delivery',
                        location: 'Local Hub',
                        timestamp: now,
                        description: 'Item is out for delivery.'
                    });
                    await order.save();
                    // Send Email
                    sendOutForDeliveryEmail(order).catch(e => console.error("Scheduler: Failed to send out for delivery email", e));
                }

                // Out for Delivery -> Delivered
                if (order.status === 'Out for Delivery' && now >= nextDayEvening) {
                    order.status = 'Delivered';
                    order.paymentStatus = 'completed'; // Ensure payment is marked completed on delivery
                    order.trackingHistory.push({
                        status: 'Delivered',
                        location: 'Customer Address',
                        timestamp: now,
                        description: 'Item has been delivered.'
                    });
                    await order.save();
                    // Send Email
                    sendOrderDeliveredEmail(order).catch(e => console.error("Scheduler: Failed to send delivered email", e));
                }
            }

        } catch (err) {
            console.error('Order Scheduler Error:', err);
        }
    }, 60000); // Check every 1 minute
};

module.exports = startOrderScheduler;
