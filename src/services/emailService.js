const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials missing. Scheduling mock email log.');
        console.log('--- MOCK EMAIL ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text}`);
        console.log('------------------');
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = {
    sendEmail,
};
