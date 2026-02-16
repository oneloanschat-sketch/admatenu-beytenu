require('dotenv').config();
const flowService = require('../src/services/flowService');

async function emulate() {
    console.log("🚀 Emulating 'Hi' message flow...");
    try {
        // Use admin phone to safe test
        const phone = process.env.ADMIN_PHONE || '972586554588';
        await flowService.processMessage(phone, "Hi");
        console.log("✅ Flow Completed Successfully.");
    } catch (e) {
        console.error("❌ Flow Failed:", e);
    }
}

emulate();
