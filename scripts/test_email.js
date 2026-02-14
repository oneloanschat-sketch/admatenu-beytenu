require('dotenv').config();
const emailService = require('../src/services/emailService');

const testEmail = async () => {
    console.log('Testing Email Service...');
    const result = await emailService.sendEmail(
        process.env.EMAIL_TO || 'test@example.com',
        'Test Subject',
        'This is a test email from Admatenu Chatbot.'
    );

    if (result) {
        console.log('Email sent successfully (or mocked).');
    } else {
        console.error('Failed to send email.');
    }
};

testEmail();
