const https = require('https');

// Configuration from frontend (src/firebase/firebase.js)
const API_KEY = "AIzaSyANoFda6Xu3i1bCi1RP_m9ghPneKZv67IQ";
const EMAIL = "admin@blissbloomly.com";
const PASSWORD = "password123";

const verifyLogin = () => {
    console.log(`Attempting login for ${EMAIL}...`);

    const data = JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true
    });

    const options = {
        hostname: 'identitytoolkit.googleapis.com',
        path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            console.log('Response Status:', res.statusCode);
            const parsed = JSON.parse(responseBody);

            if (res.statusCode === 200) {
                console.log('LOGIN SUCCESSFUL!');
                console.log('ID Token:', parsed.idToken ? '[PRESENT]' : '[MISSING]');
                console.log('User ID:', parsed.localId);
            } else {
                console.error('LOGIN FAILED');
                console.error('Error Code:', parsed.error?.code);
                console.error('Error Message:', parsed.error?.message);

                if (parsed.error?.message === 'OPERATION_NOT_ALLOWED') {
                    console.log('\nSUGGESTION: Enable "Email/Password" sign-in method in Firebase Console > Authentication > Sign-in method.');
                }
            }
        });
    });

    req.on('error', (error) => {
        console.error('Network Error:', error);
    });

    req.write(data);
    req.end();
};

verifyLogin();
