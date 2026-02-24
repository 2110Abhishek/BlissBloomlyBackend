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
<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; color: #333; padding: 14px 8px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    
    <!-- Header Section -->
    <div style="border-top: 6px solid #ff6b6b; padding: 20px 16px 0 16px">
      <h1 style="color: #ff6b6b; margin-top: 0;">Thank you for your order!</h1>
      <p style="font-size: 16px; margin-bottom: 4px;">Hi ${order.customer.name},</p>
      <p style="margin-top: 0; color: #555;">We have received your order and are getting it ready.</p>
    </div>
    
    <div style="padding: 0 16px">
      
      <!-- Order Details Box -->
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px;">Order Details</h3>
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order._id}</p>
        <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${order.totalFormatted || '₹' + order.total}</p>
        <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}</p>
        <br/>
        <p style="margin: 4px 0;"><strong>Shipping Address:</strong><br/>
          ${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.zip}
        </p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${order.customer.phone}</p>
        ${order.customer.altPhone ? `<p style="margin: 4px 0;"><strong>Alt Phone:</strong> ${order.customer.altPhone}</p>` : ''}
      </div>

      <!-- Items Table Header -->
      <h3 style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #333;">Items Ordered</h3>
      
      <!-- Dynamic Items List -->
      <table style="width: 100%; border-collapse: collapse">
        ${order.items.map(item => `
        <tr style="vertical-align: top">
          <td style="padding: 16px 8px 16px 4px; display: inline-block; width: max-content; border-bottom: 1px solid #eee;">
            <img style="height: 64px; object-fit: contain" height="64px" src="${item.image || 'https://via.placeholder.com/64'}" alt="item" />
          </td>
          <td style="padding: 16px 8px 16px 8px; width: 100%; border-bottom: 1px solid #eee;">
            <div>${item.name}</div>
            <div style="font-size: 14px; color: #888; padding-top: 4px">QTY: ${item.quantity}</div>
          </td>
          <td style="padding: 16px 4px 16px 0; white-space: nowrap; border-bottom: 1px solid #eee;">
            <strong>${item.priceFormatted || '₹' + item.price}</strong>
          </td>
        </tr>
        `).join('')}
      </table>
      
      <!-- Cost Breakdown -->
      <table style="border-collapse: collapse; width: 100%; text-align: right; margin-top: 20px; margin-bottom: 20px;">
        <tr>
          <td style="width: 60%"></td>
          <td>Shipping</td>
          <td style="padding: 8px; white-space: nowrap">₹${(order.total > 500) ? 0 : 50}</td>
        </tr>
        <tr>
          <td style="width: 60%"></td>
          <td>Handling / Tax</td>
          <td style="padding: 8px; white-space: nowrap">₹0</td>
        </tr>
        <tr>
          <td style="width: 60%"></td>
          <td style="border-top: 2px solid #333; padding-top: 16px;">
            <strong style="white-space: nowrap; font-size: 16px;">Order Total</strong>
          </td>
          <td style="padding: 16px 8px 0; border-top: 2px solid #333; white-space: nowrap;">
            <strong style="font-size: 16px;">${order.totalFormatted || '₹' + order.total}</strong>
          </td>
        </tr>
      </table>
      
      <p style="font-size: 13px; color: #666; padding-bottom: 16px; margin-top: 24px;">
        If you have any questions, please reply to this email.
      </p>
    </div>
  </div>
  
  <!-- Footer -->
  <div style="max-width: 600px; margin: auto; padding-top: 16px">
    <p style="color: #999; font-size: 12px; text-align: center;">
      This email was sent to ${order.customer.email}<br />
      You received this email because you placed an order at Bliss Bloomly.
    </p>
  </div>  
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
