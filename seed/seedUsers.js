const admin = require('../firebaseAdmin');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blissbloomly';

const seedUser = async () => {
    try {
        // 1. Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');

        const email = 'admin@blissbloomly.com';
        const password = 'password123';
        const name = 'Admin User';

        // 2. Create User in Firebase
        console.log(`Checking/Creating user in Firebase: ${email}`);
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(email);
            console.log('User already exists in Firebase:', firebaseUser.uid);
            console.log('Updating password for existing user...');
            await admin.auth().updateUser(firebaseUser.uid, {
                password: password,
                emailVerified: true
            });
            console.log('Password updated successfully.');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                firebaseUser = await admin.auth().createUser({
                    email,
                    password,
                    displayName: name,
                    emailVerified: true // Important for login
                });
                console.log('Created new user in Firebase:', firebaseUser.uid);
            } else {
                throw error;
            }
        }

        // 3. Create/Update User in MongoDB
        console.log(`Checking/Creating user in MongoDB: ${email}`);
        let mongoUser = await User.findOne({ email });

        if (!mongoUser) {
            mongoUser = new User({
                email,
                name,
                firebaseUid: firebaseUser.uid,
                orders: []
            });
            await mongoUser.save();
            console.log('Created new user in MongoDB');
        } else {
            // Update firebaseUid just in case it's different (e.g. if DB was wiped but Firebase wasn't)
            if (mongoUser.firebaseUid !== firebaseUser.uid) {
                mongoUser.firebaseUid = firebaseUser.uid;
                await mongoUser.save();
                console.log('Updated existing MongoDB user with new Firebase UID');
            } else {
                console.log('User already exists in MongoDB and is synced');
            }
        }

        console.log('\n-----------------------------------');
        console.log('SEEDING SUCCESSFUL');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding user:', error);
        process.exit(1);
    }
};

seedUser();
