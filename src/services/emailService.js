const sendEmail = async (to, subject, text) => {
    // In a real app, use Nodemailer here.
    // const nodemailer = require('nodemailer');
    // ... configuration ...

    console.log('--- EMAIL SENT ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}`);
    console.log('------------------');

    return true;
};

module.exports = {
    sendEmail,
};
