const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/babybliss';

const debugUser = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");

        const uid = 'nso4aS7wB6UxD8DADL3urytzf4D3';
        console.log(`Searching for user with firebaseUid: ${uid}`);

        const user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            console.log("User NOT FOUND");
        } else {
            console.log("User Found:", user._id);
            console.log("Addresses count:", user.addresses.length);
            console.log("Addresses content:", JSON.stringify(user.addresses, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
};

debugUser();
