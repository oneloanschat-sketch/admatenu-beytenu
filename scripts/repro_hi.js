const flowService = require('../src/services/flowService');
const whatsappService = require('../src/services/whatsappService');
const aiService = require('../src/services/aiService');

// Mock WhatsApp Service
whatsappService.sendMessage = async (to, body) => {
    console.log(`[MockWhatsApp] Sending to ${to}: "${body}"`);
};

// Mock AI Service (optional, but let's see if real one works first or fails)
// If checking logic flow, we might want real AI to see if it returns null.
// But valid API key is needed. The env is loaded by flowService imports.

async function testHi() {
    console.log("--- Testing 'היי' (New Session) ---");
    // Force new session by using random phone
    const phone = '97250' + Math.floor(Math.random() * 10000000);

    await flowService.processMessage(phone, 'היי');
}

testHi();
