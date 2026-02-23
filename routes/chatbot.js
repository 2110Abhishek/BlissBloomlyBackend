// routes/chatbot.js
const express = require('express');
const router = express.Router();
const { processMessage } = require('../utils/chatbotBrain');

// POST /api/chatbot
// Body: { message: "query string" }
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ response: "Please enter a message." });
        }

        // Add an artificial small delay to make it feel like AI is "typing"
        await new Promise(resolve => setTimeout(resolve, 800));

        const reply = await processMessage(message);

        res.json({
            response: reply.text,
            intent: reply.intent
        });

    } catch (error) {
        console.error("Chatbot endpoint error:", error);
        res.status(500).json({ response: "I am experiencing technical difficulties right now. Please try again later." });
    }
});

module.exports = router;
