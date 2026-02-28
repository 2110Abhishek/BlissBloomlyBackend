const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Seller = require('./models/Seller');

dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB");
        const sellers = await Seller.find({});
        console.log("All sellers:", sellers.map(s => s.email));

        if (sellers.length > 0) {
            const seller = sellers[0];
            seller.bankAccount = {
                accountNumber: '123456789012',
                ifscCode: 'HDFC0001234',
                bankName: 'HDFC Bank'
            };
            await seller.save();
            console.log('Updated seller bank account for:', seller.email);
        } else {
            console.log('No sellers found.');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error("DB Connection Error:", err);
        process.exit(1);
    });
