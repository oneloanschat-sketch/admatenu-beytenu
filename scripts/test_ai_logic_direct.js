require('dotenv').config();
const aiService = require('../src/services/aiService');

async function testAi() {
    console.log("Testing AI Service...");

    // Test 1: Greeting (Should be valid)
    console.log("\n--- Test 1: Greeting ---");
    const res1 = await aiService.processStep('GREETING', 'שלום, מה שלומך?', {}, 'he', []);
    console.log("Result 1:", JSON.stringify(res1, null, 2));

    // Test 2: Qualification (Under 200k - Should be valid but maybe rejected in content, or processed)
    // The prompt says "Reject if < 200k in the response".
    console.log("\n--- Test 2: Qualification (100k) ---");
    const res2 = await aiService.processStep('QUALIFICATION', 'אני צריך 100,000 שקל', {}, 'he', []);
    console.log("Result 2:", JSON.stringify(res2, null, 2));

    // Test 3: Qualification (Valid)
    console.log("\n--- Test 3: Qualification (500k) ---");
    const res3 = await aiService.processStep('QUALIFICATION', 'חצי מיליון', {}, 'he', []);
    console.log("Result 3:", JSON.stringify(res3, null, 2));
}

testAi();
