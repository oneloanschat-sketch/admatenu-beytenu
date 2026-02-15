require('dotenv').config();
const flowService = require('../src/services/flowService');
const aiService = require('../src/services/aiService');

// Properly Mock WhatsApp
const whatsappService = require('../src/services/whatsappService');
whatsappService.sendMessage = async (to, text) => {
    console.log(`[Bot -> ${to}]: ${text}`);
};

// Properly Mock DB (In-memory)
const mockDb = {
    // Basic mock that returns null so flowService uses localSessions fallback
    from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: 'Mock DB Error' }) }) }),
        insert: async () => ({ data: {}, error: null }),
        update: () => ({ eq: async () => ({}) })
    })
};
flowService.injectDb(mockDb);

async function runTest() {
    const phone = '0509998887';

    const conversation = [
        { use: "Hi", expect: "Greeting" },
        { use: "Yoni Tester", expect: "Listening" },
        { use: "I need a loan", expect: "Amount" },
        { use: "500000", expect: "City" },
        { use: "Tel Aviv", expect: "Purpose" },
        { use: "Renovation", expect: "Property" },
        { use: "Yes", expect: "Permit" },
        { use: "Yes", expect: "Risk" },
        { use: "No problems", expect: "Anything Else" },
        { use: "Nothing else", expect: "Closing" }
    ];

    console.log("--- STARTING E2E TEST ---");

    for (const turn of conversation) {
        console.log(`\n[User]: ${turn.use} (Expect: ${turn.expect})`);
        await flowService.processMessage(phone, turn.use);
        // Wait for AI to process
        await new Promise(r => setTimeout(r, 2000));
    }
}

runTest();
