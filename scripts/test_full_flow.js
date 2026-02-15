require('dotenv').config();
const flowService = require('../src/services/flowService');
const aiService = require('../src/services/aiService');

// Mock helpers
const mockWhatsapp = {
    sendMessage: async (to, text) => console.log(`[Bot]: ${text}`)
};
const mockDb = {
    from: (table) => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: async () => ({ data: {}, error: null }),
        update: () => ({ eq: async () => ({}) })
    })
};

// Inject mocks
const whatsappService = require('../src/services/whatsappService');
whatsappService.sendMessage = mockWhatsapp.sendMessage;
flowService.injectDb(mockDb);

async function runTest() {
    const phone = '0501234567';

    console.log("--- STARTING FLOW TEST ---");

    const steps = [
        "היי", // Greeting
        "יוסי כהן", // Name
        "אני רוצה הלוואה", // Listening -> Amount logic? No, Listening -> Amount Question
        "500000", // Amount
        "חיפה", // City
        "שיפוץ", // Purpose
        "כן יש לי דירה", // Property -> Should ask Permit
        "כן יש היתר", // Permit -> Should ask Risk
        "לא היו בעיות", // Risk -> Should ask Anything Else
        "לא תודה" // Anything Else -> Closing
    ];

    for (const input of steps) {
        console.log(`\n[User]: ${input}`);
        await flowService.processMessage(phone, input);
        // Wait a bit for AI real latency simulation
        await new Promise(r => setTimeout(r, 1000));
    }
}

runTest();
