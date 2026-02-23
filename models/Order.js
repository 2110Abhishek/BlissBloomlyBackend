//models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      productId: String, // Changed to String to match Product ID type if needed, or keep Number if auto-inc
      name: String,
      price: Number,
      priceFormatted: String,
      quantity: Number,
      image: String,
      sellerId: String, // Firebase UID of the seller
      selectedSize: String,
      selectedColor: String,
      selectedAge: String,
      selectedPack: String
    }
  ],
  subtotal: Number, // USD
  shipping: Number,
  discountPercent: Number,
  discountAmount: Number,
  couponCode: String,
  total: Number,
  totalFormatted: String, // Store '₹5,329' directly for email consistency
  customer: {
    name: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    email: String,
    phone: String,
    altPhone: String
  },
  paymentMethod: { type: String, enum: ['cod', 'upi', 'card', 'online'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  status: { type: String, default: 'pending' },
  refundStatus: { type: String, enum: ['none', 'initiated', 'processed', 'failed'], default: 'none' },
  cancellationReason: String,
  paymentId: String,
  trackingId: String,
  expectedDelivery: Date,
  returnStatus: { type: String, enum: ['none', 'requested', 'approved', 'pickup_scheduled', 'out_for_pickup', 'picked_up', 'refunded', 'rejected', 'completed'], default: 'none' },
  returnReason: String,
  returnDate: Date,
  returnApprovedDate: Date,
  trackingHistory: [
    {
      status: String, // e.g., 'Placed', 'Packed', 'Shipped', 'Out for Delivery'
      location: String,
      description: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firebaseUid: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
