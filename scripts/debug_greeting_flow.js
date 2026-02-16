const flowService = require('../src/services/flowService');
const whatsappService = require('../src/services/whatsappService');
const aiService = require('../src/services/aiService');

// Mock WhatsApp to capture output
let lastSentMessage = "";
whatsappService.sendMessage = async (to, body) => {
    console.log(`[MockWhatsApp] To ${to}: "${body}"`);
    lastSentMessage = body;
};

async function testFlow() {
    const phone = '97250' + Math.floor(Math.random() * 10000000);
    console.log(`Testing with Phone: ${phone}`);

    // 1. Send "Hi"
    console.log("\n--- Step 1: User says 'Hi' ---");
    await flowService.processMessage(phone, 'היי');

    // Check internal state (we can't easily check private DB/Local state from outside unless we peer into flowService)
    // But we can judge by the response.
    // Expected: Greeting message.

    // 2. Send "Not great"
    console.log("\n--- Step 2: User says 'Not great' (לא משהו) ---");
    await flowService.processMessage(phone, 'לא משהו');

    // Expected: Empathy + Ask Name
    // If we see "סליחה, לא הבנתי...", FAIL.

    if (lastSentMessage.includes('סליחה, לא הבנתי')) {
        console.error("FAIL: Bot returned validation error instead of empathy.");
    } else {
        console.log("SUCCESS: Bot returned:", lastSentMessage);
    }
}

testFlow();
