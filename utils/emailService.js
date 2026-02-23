const nodemailer = require('nodemailer');

const sendOrderConfirmation = async (order) => {
  try {
    console.log("Starting SMTP Connection for Order Confirmation...");
    const cleanPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '').trim() : '';
    console.log(`Email Password Length after cleaning: ${cleanPass.length}`);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      debug: true,
      logger: true
    });

    console.log("Verifying SMTP Connection...");
    transporter.verify(function (error, success) {
      if (error) {
        console.log("SMTP Verification Failed:", error);
      } else {
        console.log("SMTP Verification Success: Server is ready to take our messages");
      }
    });

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

    console.log("Calling sendMail...");
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email inside sendOrderConfirmation:', error);
    return false;
  }
};

const sendOrderShippedEmail = async (order) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '').trim() : ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

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

    await transporter.sendMail(mailOptions);
    console.log(`Shipped email sent to ${order.customer.email}`);
    return true;
  } catch (error) {
    console.error('Error sending shipped email:', error);
    return false;
  }
};

const sendOrderDeliveredEmail = async (order) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '').trim() : ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

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

    await transporter.sendMail(mailOptions);
    console.log(`Delivered email sent to ${order.customer.email}`);
    return true;
  } catch (error) {
    console.error('Error sending delivered email:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '').trim() : ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

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

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

module.exports = { sendOrderConfirmation, sendOrderShippedEmail, sendOrderDeliveredEmail, sendWelcomeEmail };
