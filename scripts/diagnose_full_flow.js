const aiService = require('../src/services/aiService');
const whatsappService = require('../src/services/whatsappService');
require('dotenv').config();

async function runDiagnostic() {
    console.log("🔍 Starting Full Flow Diagnostic...");
    const testPhone = process.env.ADMIN_PHONE;

    if (!testPhone) {
        console.error("❌ ADMIN_PHONE missing in .env");
        process.exit(1);
    }

    // 1. Test AI Generation
    console.log("\n--- Step 1: AI Generation (Groq) ---");
    const startTime = Date.now();
    let aiResponse = "";
    try {
        aiResponse = await aiService.generateResponse('GREETING', 'Hi', {}, 'he');
        const duration = Date.now() - startTime;
        console.log(`✅ AI Response (${duration}ms): "${aiResponse}"`);
    } catch (e) {
        console.error("❌ AI Generation Failed:", e);
        process.exit(1);
    }

    if (!aiResponse) {
        console.error("❌ AI Response is empty/null");
        process.exit(1);
    }

    // 2. Test WhatsApp Sending
    console.log("\n--- Step 2: WhatsApp Sending (UltraMsg) ---");
    try {
        const sendRes = await whatsappService.sendMessage(testPhone, `[Diagnostic] ${aiResponse}`);
        if (sendRes && sendRes.sent === "true") {
            console.log("✅ WhatsApp Send Success!");
        } else {
            console.log("⚠️ WhatsApp Send Returned:", sendRes);
        }
    } catch (e) {
        console.error("❌ WhatsApp Send Failed:", e);
        process.exit(1);
    }

    console.log("\n🎉 Diagnostic Completed Successfully.");
}

runDiagnostic();
