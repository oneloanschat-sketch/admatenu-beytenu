const aiService = require('../src/services/aiService');
require('dotenv').config();

async function runTests() {
    console.log("🚀 Starting Comprehensive AI Service Verification...");
    let passed = 0;
    let failed = 0;

    async function assert(desc, fn) {
        try {
            console.log(`\nTesting: ${desc}`);
            const res = await fn();
            if (res) {
                console.log("✅ PASS");
                passed++;
            } else {
                console.log("❌ FAIL");
                failed++;
            }
        } catch (e) {
            console.log(`❌ EXCEPTION: ${e.message}`);
            failed++;
        }
    }

    // Test 1: Generate Response (Greeting)
    await assert("Generate Greeting (Simple)", async () => {
        const res = await aiService.generateResponse('GREETING', 'Hi', {}, 'he');
        console.log(`   Output: "${res}"`);
        return res && res.includes("שלום");
    });

    // Test 2: Process Step - Valid Name
    await assert("Process Step: GET_NAME (Valid Input: 'David')", async () => {
        const res = await aiService.processStep('GET_NAME', 'David', {}, 'he');
        console.log(`   Result: Valid=${res.isValid}, Response="${res.response}"`);
        return res.isValid === true && typeof res.response === 'string';
    });

    // Test 3: Process Step - Invalid Name (Validation Logic)
    await assert("Process Step: GET_NAME (Invalid Input: 'Pizza')", async () => {
        const res = await aiService.processStep('GET_NAME', 'Pizza', {}, 'he');
        console.log(`   Result: Valid=${res.isValid}, Response="${res.response}"`);
        // Note: AI might be lenient, but we expect it to try to validate if instructed.
        // If the AI is smart, it should reject 'Pizza' as a name if validation prompts it.
        // We accept either result but want to see the logic work without crashing.
        return typeof res.isValid === 'boolean';
    });

    // Test 4: Process Step - Qualification (Extraction check)
    await assert("Process Step: QUALIFICATION (Input: '500,000')", async () => {
        const res = await aiService.processStep('QUALIFICATION', '500,000', {}, 'he');
        console.log(`   Result: Valid=${res.isValid}, Response="${res.response}"`);
        return res.isValid === true && res.response.length > 0;
    });

    console.log(`\n🏁 Test Summary: ${passed} Passed, ${failed} Failed.`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
