const axios = require('axios');

// EmailJS Configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_sbyj327'; // User's service ID
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_placeholder'; // Needs to be set in env
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'public_key_placeholder'; // Needs to be set in env
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || 'private_key_placeholder'; // Needs to be set in env

const sendEmailJsWrapper = async (to_email, to_name, subject, html_message) => {
  try {
    console.log(`Sending EmailJS Request to: ${to_email}`);

    const data = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY, // Required for REST API server-side
      template_params: {
        to_email: to_email,
        to_name: to_name || 'Customer',
        subject: subject,
        message: html_message
      }
    };

    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data, config);

    if (response.status === 200 || response.data === 'OK') {
      console.log('EmailJS Successfully Sent!');
      return true;
    } else {
      console.error('EmailJS returned non-200 status:', response.data);
      return false;
    }
  } catch (error) {
    // EmailJS usually throws 400 errors for bad configuration or 403 for bad keys
    console.error('EmailJS Request Error:', error.response ? error.response.data : error.message);
    return false;
  }
};

const sendOrderConfirmation = async (order) => {
  const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; min-width: 300px;">
          <h1 style="color: #ff6b6b;">Thank you for your order!</h1>
          <p>Hi ${order.customer.name},</p>
          <p>We have received your order and are getting it ready.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Amount:</strong> ${order.totalFormatted || '₹' + order.total}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p><strong>Shipping Address:</strong><br/>
              ${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.zip}
            </p>
          </div>
          <p>If you have any questions, please reply to this email.</p>
        </div>
    `;

  return await sendEmailJsWrapper(
    order.customer.email,
    order.customer.name,
    `Order Confirmation - Order #${order._id}`,
    htmlMessage
  );
};

const sendOrderShippedEmail = async (order) => {
  const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Your Order has been Shipped! 🚚</h1>
          <p>Hi ${order.customer.name},</p>
          <p>Great news! Your order is on its way.</p>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p><strong>Order ID:</strong> ${order._id}</p>
             <p><strong>Expected Delivery:</strong> ${order.expectedDelivery ? new Date(order.expectedDelivery).toDateString() : 'Coming soon'}</p>
          </div>
          <p>You can track your order status in your account.</p>
        </div>
    `;

  return await sendEmailJsWrapper(
    order.customer.email,
    order.customer.name,
    `Order Shipped - Order #${order._id}`,
    htmlMessage
  );
};

const sendOrderDeliveredEmail = async (order) => {
  const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Your Order has been Delivered! 🎉</h1>
          <p>Hi ${order.customer.name},</p>
          <p>Your order has been delivered successfully. We hope you love your purchase!</p>
          <p>Thank you for shopping with Bliss Bloomly!</p>
        </div>
    `;

  return await sendEmailJsWrapper(
    order.customer.email,
    order.customer.name,
    `Order Delivered - Order #${order._id}`,
    htmlMessage
  );
};

const sendWelcomeEmail = async (email) => {
  const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #db2777;">Welcome to Bliss Bloomly! 💖</h1>
          <p>Hi there,</p>
          <p>Thank you for joining our parent community!</p>
          <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
             <h3>Enjoy 10% OFF your next order!</h3>
             <p>Use code: <strong>WELCOME10</strong></p>
          </div>
        </div>
    `;

  return await sendEmailJsWrapper(
    email,
    'There',
    `Welcome to the Bliss Bloomly Family! 👶`,
    htmlMessage
  );
};

module.exports = { sendOrderConfirmation, sendOrderShippedEmail, sendOrderDeliveredEmail, sendWelcomeEmail };
