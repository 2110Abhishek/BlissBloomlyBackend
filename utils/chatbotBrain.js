// utils/chatbotBrain.js
const Product = require('../models/Product');

/**
 * AI Chatbot Intent Matching Engine
 * Processes natural language queries and returns appropriate responses based on 9 core intents.
 */
async function processMessage(message) {
    const text = message.toLowerCase();

    // 1. Return Policy
    if (text.match(/return|refund|exchange|send back/)) {
        return {
            intent: 'returns',
            text: "Our Return Policy: You can return most items within 7 days of delivery for a full refund. Items must be in original condition with tags attached. Hygiene products (like breast pumps or teethers) cannot be returned if opened. Would you like a link to start a return?"
        };
    }

    // 2. Shipping Details
    if (text.match(/shipping|delivery|when will it arrive|how long|dispatch/)) {
        return {
            intent: 'shipping',
            text: "We offer Free Standard Shipping on orders over ₹500 (arrives in 3-5 business days). For faster delivery, we offer Express Shipping flat rate (arrives in 1-2 business days). Orders placed before 2 PM are dispatched the same day!"
        };
    }

    // 4. Size Recommendations
    if (text.match(/size|measurements|too big|too small|fit|sizing/)) {
        return {
            intent: 'sizing',
            text: "BlissBloomly sizing is based on average baby percentiles. \n\n• 0-3M: Up to 12 lbs / 23 in\n• 3-6M: 12-16 lbs / 23-25 in\n• 6-9M: 16-20 lbs / 25-27 in\n• 9-12M: 20-24 lbs / 27-29 in"
        };
    }

    // 5. Order Tracking
    if (text.match(/track|where is my order|status|has it shipped/)) {
        return {
            intent: 'tracking',
            text: "To track your order, please log into your account and visit the 'My Orders' section. You can click on any order to see real-time tracking updates. If you placed a guest order, please check your email for the tracking link."
        };
    }

    // 6. Payment Methods
    if (text.match(/payment|pay|card|upi|\bcod\b|cash on delivery/)) {
        return {
            intent: 'payment',
            text: "We accept all major Credit/Debit Cards, UPI, Net Banking, and Wallets. We also offer Cash on Delivery (COD) for orders up to ₹5,000 in eligible pin codes."
        };
    }

    // 7. Coupons & Discounts
    if (text.match(/coupon|discount|promo|code|offer|sale/)) {
        return {
            intent: 'discounts',
            text: "We have several discount codes available!\n• BLISSBLOOMLY50: Get ₹50 off on everything (minimum spend ₹300)\n• SUMMER10: 10% off (minimum spend ₹500)\n• FREESHIP: Free shipping on orders over ₹2000\n• TOYS20: 20% off all toys (minimum spend ₹300)\n• FIRSTORDER: 15% off your first order."
        };
    }

    // 8. Material & Care Instructions
    if (text.match(/wash|care|material|cotton|fabric|iron/)) {
        return {
            intent: 'care',
            text: "Most of our baby clothing is made from 100% organic, breathable cotton. We recommend machine washing on a gentle, cold cycle with baby-safe detergent. Tumble dry low. Avoid bleach or harsh chemicals!"
        };
    }

    // 9. Gift Services & Wrapping
    if (text.match(/gift|wrap|registry|present/)) {
        return {
            intent: 'gifts',
            text: "Yes! We offer premium gift wrapping for an additional ₹50 at checkout. You can also add a personalized gift message. (Note: Invoices are not included in the box if marked as a gift)."
        };
    }

    // 10. Contact Info / Human Support
    if (text.match(/contact|customer service|email|phone|call|talk to a person|human/)) {
        return {
            intent: 'contact',
            text: "Need to speak with a human? You can reach our support team at blissbloomly@gmail.com or call us at +91 9370165188 (24/7). We're happy to help!"
        };
    }

    // 11. Order Cancellation / Modification
    if (text.match(/cancel|change order|modify|mistake/)) {
        return {
            intent: 'cancellation',
            text: "Orders can only be cancelled or modified within 1 hour of placement, before they are processed for dispatch. Please contact blissbloomly@gmail.com immediately with your Order ID if you need to make changes."
        };
    }

    // 12. Out of Stock / Restock
    if (text.match(/out of stock|restock|when will it be available|sold out/)) {
        return {
            intent: 'restock',
            text: "Popular items often sell out fast! We typically restock core items within 2-3 weeks. You can add the item to your Wishlist to easily check back later."
        };
    }

    // 13. International Shipping
    if (text.match(/international|ship to|other countries|global/)) {
        return {
            intent: 'international',
            text: "Currently, BlissBloomly only ships domestically within the country. We are hoping to expand to international shipping in the near future!"
        };
    }

    // 3. Product Suggestions (Dynamic Search)
    // Looking for phrases like "recommend a toy", "looking for a dress", "best bottles"
    if (text.match(/recommend|suggest|looking for|want a|need a/)) {
        try {
            // Extract a potential keyword (super basic NLP)
            const words = text.replace(/recommend|suggest|looking for|want a|need a|best/g, '').trim().split(' ');
            const searchTag = words.find(w => w.length > 2); // get a meaningful word

            if (searchTag) {
                const products = await Product.find({
                    $or: [
                        { category: new RegExp(searchTag, 'i') },
                        { tags: new RegExp(searchTag, 'i') },
                        { name: new RegExp(searchTag, 'i') }
                    ]
                }).limit(2).select('name _id price image');

                if (products.length > 0) {
                    let productText = products.map(p => `• ${p.name} (₹${p.price})`).join('\n');
                    return {
                        intent: 'recommendation',
                        text: `Based on what you asked, you might like these:\n${productText}\n\nYou can search for "${searchTag}" in our top search bar to see them!`
                    };
                }
            }
        } catch (e) {
            console.error("Chatbot Recommendation Error:", e);
        }

        // Fallback for suggestions if regex fails
        return {
            intent: 'recommendation_fallback',
            text: "I can help suggest products! Try searching for categories like 'Toys', 'Clothing', or 'Bath Care' in the top search bar, or check out our New Arrivals section."
        };
    }

    // 0. Fallback / Default Greeting
    if (text.match(/hi|hello|hey|help/)) {
        return {
            intent: 'greeting',
            text: "Hello there! 👋 I am the BlissBloomly Assistant. I can help answer questions about shipping, returns, sizes, finding products, and more. How can I help you today?"
        };
    }

    return {
        intent: 'unknown',
        text: "I'm still learning! I didn't quite catch that. Could you try rephrasing your question? I can help with Returns, Shipping, Sizing, Payments, and Tracking."
    };
}

module.exports = { processMessage };
