const Order = require('../models/Order');

const startOrderScheduler = () => {
    console.log('Starting Order Status Scheduler...');

    // Run every 60 seconds
    setInterval(async () => {
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
            await Order.updateMany(
                {
                    status: 'Packed',
                    createdAt: { $lte: twoHoursAgo }
                },
                {
                    $set: { status: 'Shipped' },
                    $push: {
                        trackingHistory: {
                            status: 'Shipped',
                            location: 'Dispatch Center',
                            timestamp: now,
                            description: 'Order has been shipped.'
                        }
                    }
                }
            );

            // 4. Shipped -> Out for Delivery (Next Day 9:00 AM)
            // Logic: If status is Shipped AND (Now is after 9 AM AND CreatedAt is before today 12:00 AM i.e. previous day)
            // Simpler Logic for MVP: If Shipped and time > 12 hours (approximating next day)
            // Strict User Requirement: "next day morning"
            // Let's check individually for better precision or use a range.
            // We'll iterate to handle "Next Day 9 AM" logic more accurately for a demo.
            // If today is > createdAt day AND current hour >= 9

            const ordersToDeliver = await Order.find({
                status: { $in: ['Shipped', 'Out for Delivery'] }
            });

            for (const order of ordersToDeliver) {
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
                }
            }

        } catch (err) {
            console.error('Order Scheduler Error:', err);
        }
    }, 60000); // Check every 1 minute
};

module.exports = startOrderScheduler;
