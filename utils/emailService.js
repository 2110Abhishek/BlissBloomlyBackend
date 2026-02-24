const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
  }
});

const sendOrderConfirmation = async (order) => {
  try {
    console.log("Sending Order Confirmation to:", order.customer.email);

    const mailOptions = {
      from: `"Bliss Bloomly" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      subject: `Order Confirmation - Order #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ff6b6b;">Thank you for your order!</h1>
          <p>Hi ${order.customer.name},</p>
          <p>We have received your order and are getting it ready.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Amount:</strong> ${order.totalFormatted || '₹' + order.total}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p><strong>Shipping Address:</strong><br/>
              ${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.zip}<br/>
              <strong>Phone:</strong> ${order.customer.phone} <br/>
              <strong>Alt Phone:</strong> ${order.customer.altPhone || 'N/A'}
            </p>
          </div>

          <h3>Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #eee;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 10px;">
                    ${item.name}
                    ${item.selectedSize ? `<br/><small style="color: #666;">Size: ${item.selectedSize}</small>` : ''}
                    ${item.selectedColor ? `<br/><small style="color: #666;">Color: ${item.selectedColor}</small>` : ''}
                    ${item.selectedAge ? `<br/><small style="color: #666;">Age: ${item.selectedAge}</small>` : ''}
                    ${item.selectedPack ? `<br/><small style="color: #666;">Pack: ${item.selectedPack}</small>` : ''}
                  </td>
                  <td style="padding: 10px; text-align: right;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right;">${item.priceFormatted || '₹' + item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p style="margin-top: 30px; font-size: 12px; color: #888;">
            If you have any questions, please reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Order Confirmation Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email via Nodemailer:', error);
    return false;
  }
};

const sendOrderShippedEmail = async (order) => {
  try {
    const mailOptions = {
      from: `"Bliss Bloomly" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      subject: `Order Shipped - Order #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Your Order has been Shipped! 🚚</h1>
          <p>Hi ${order.customer.name},</p>
          <p>Great news! Your order is on its way.</p>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p><strong>Order ID:</strong> ${order._id}</p>
             <p><strong>Tracking ID:</strong> ${order.trackingId || 'N/A'}</p>
             <p><strong>Expected Delivery:</strong> ${order.expectedDelivery ? new Date(order.expectedDelivery).toDateString() : 'Coming soon'}</p>
          </div>
          
          <p>You can track your order status in your account.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Shipped email sent to ${order.customer.email} via Nodemailer`);
    return true;
  } catch (error) {
    console.error('Error sending shipped email via Nodemailer:', error);
    return false;
  }
};

const sendOrderDeliveredEmail = async (order) => {
  try {
    const mailOptions = {
      from: `"Bliss Bloomly" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      subject: `Order Delivered - Order #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Your Order has been Delivered! 🎉</h1>
          <p>Hi ${order.customer.name},</p>
          <p>Your order has been delivered successfully. We hope you love your purchase!</p>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p><strong>Order ID:</strong> ${order._id}</p>
             <p><strong>Delivery Date:</strong> ${new Date().toDateString()}</p>
          </div>
          
          <p>Thank you for shopping with Bliss Bloomly!</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Delivered email sent to ${order.customer.email} via Nodemailer`);
    return true;
  } catch (error) {
    console.error('Error sending delivered email via Nodemailer:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email) => {
  try {
    const mailOptions = {
      from: `"Bliss Bloomly" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to the Bliss Bloomly Family! 👶`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #db2777;">Welcome to Bliss Bloomly! 💖</h1>
          <p>Hi there,</p>
          <p>Thank you for joining our parent community! We're so excited to have you.</p>
          <p>You'll now be the first to know about:</p>
          <ul>
            <li>New product arrivals</li>
            <li>Exclusive subscriber-only offers</li>
            <li>Parenting tips and guides</li>
          </ul>
          
          <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
             <h3>Enjoy 10% OFF your next order!</h3>
             <p>Use code: <strong>WELCOME10</strong></p>
          </div>
          
          <p>Happy Parenting!</p>
          <p>The Bliss Bloomly Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email} via Nodemailer`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email via Nodemailer:', error);
    return false;
  }
};

module.exports = { sendOrderConfirmation, sendOrderShippedEmail, sendOrderDeliveredEmail, sendWelcomeEmail };
