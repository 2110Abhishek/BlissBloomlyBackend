const admin = require('../firebaseAdmin');

const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Check if the email matches the allowed admin email
        if (decodedToken.email === 'blissbloomly@gmail.com') {
            req.user = decodedToken;
            next();
        } else {
            return res.status(403).json({ message: 'Forbidden: Admin access only' });
        }
    } catch (error) {
        console.error("Admin Verification Error:", error);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyAdmin;
