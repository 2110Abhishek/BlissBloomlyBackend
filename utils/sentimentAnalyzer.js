// utils/sentimentAnalyzer.js

// Very basic dictionary for abuse detection
const abusiveWords = [
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard', 'hell', 'damn', 'crap', 'garbage', 'trash', 'idiot', 'stupid', 'scam', 'fraud' // Extended list typically used in production
];

// Very basic dictionary for sentiment scoring
const positiveWords = [
    'great', 'excellent', 'amazing', 'perfect', 'love', 'liked', 'good', 'awesome', 'fantastic',
    'wonderful', 'beautiful', 'cute', 'soft', 'comfortable', 'recommend', 'happy', 'impressed', 'best'
];

const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointed', 'hate', 'worst', 'cheap',
    'broken', 'ugly', 'uncomfortable', 'annoying', 'regret', 'issue', 'problem', 'flaw'
];

/**
 * Custom NLP function to analyze review text and rating.
 * @param {string} text The review comment
 * @param {number} rating The star rating (1-5)
 * @param {boolean} isVerified Whether it's a verified purchase
 * @returns {object} { isAbusive, sentiment, isHighlighted }
 */
function analyzeReview(text, rating, isVerified) {
    if (!text) {
        return { isAbusive: false, sentiment: 'Neutral', isHighlighted: false };
    }

    const lowercaseText = text.toLowerCase();

    // 1. Abuse Detection
    const hasAbuse = abusiveWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowercaseText);
    });

    if (hasAbuse) {
        return { isAbusive: true, sentiment: 'Negative', isHighlighted: false };
    }

    // 2. Sentiment Scoring
    let score = 0;

    positiveWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowercaseText.match(regex);
        if (matches) score += matches.length;
    });

    negativeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowercaseText.match(regex);
        if (matches) score -= (matches.length * 2); // Weigh negative words more heavily
    });

    // Determine Sentiment Category based on Score AND Rating
    let sentiment = 'Neutral';

    // If rating is extreme, let it heavily influence the sentiment
    if (rating >= 4 || score > 0) {
        sentiment = 'Positive';
    } else if (rating <= 2 || score < 0) {
        sentiment = 'Negative';
    } else {
        // Rating is 3, rely strictly on score
        if (score > 0) sentiment = 'Positive';
        else if (score < 0) sentiment = 'Negative';
    }

    // 3. Highlighting Logic
    // Must be 5 stars, strongly positive word score, and a verified purchase
    const isHighlighted = (rating === 5 && score >= 2 && isVerified);

    return {
        isAbusive: false,
        sentiment,
        isHighlighted
    };
}

module.exports = { analyzeReview };
