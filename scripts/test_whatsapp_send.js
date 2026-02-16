const whatsappService = require('../src/services/whatsappService');
require('dotenv').config();

async function testSend() {
    const to = process.env.ADMIN_PHONE; // Sends to yourself
    if (!to) {
        console.error("❌ ADMIN_PHONE not set in .env");
        return;
    }

    console.log(`Sending test message to: ${to} via UltraMsg...`);
    try {
        const res = await whatsappService.sendMessage(to, "Hello! This is a test from your bot connection check. 🤖");
        console.log("✅ Send Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("❌ Send Failed:", e.message);
        if (e.response) {
            console.error("details:", e.response.data);
        }
    }
}

testSend();
