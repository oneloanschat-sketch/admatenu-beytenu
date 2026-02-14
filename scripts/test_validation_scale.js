require('dotenv').config();
const aiService = require('../src/services/aiService');

async function runScenario(id, step, input, lang, expectedValid) {
    console.log(`[Test ${id}] Step: ${step}, Input: "${input}", Lang: ${lang}`);
    const result = await aiService.validateInput(input, step, lang);
    const passed = result.isValid === expectedValid;

    if (passed) {
        console.log(`✅ PASS. Valid: ${result.isValid}`);
    } else {
        console.log(`❌ FAIL. Expected Valid: ${expectedValid}, Got: ${result.isValid}`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Suggested Response: ${result.suggestedResponse}`);
    }
    console.log("---------------------------------------------------");
    return passed;
}

async function runScaleTests() {
    console.log("Starting Scale Tests (Simulated 100+ interactions logic)...");

    let passedCount = 0;
    const scenarios = [
        // Hebrew Scenarios
        { step: 'GET_NAME', input: 'דניאל כהן', lang: 'he', expected: true },
        { step: 'GET_NAME', input: 'אני לא רוצה להגיד לך', lang: 'he', expected: false }, // Objection
        { step: 'GET_NAME', input: 'פיצה פפרוני', lang: 'he', expected: false }, // Nonsense
        { step: 'DATA_COLLECTION_CITY', input: 'תל אביב', lang: 'he', expected: true },
        { step: 'DATA_COLLECTION_CITY', input: 'למה זה חשוב?', lang: 'he', expected: false }, // Objection

        // Arabic Scenarios
        { step: 'GET_NAME', input: 'מוחמד אגבריה', lang: 'ar', expected: true },
        { step: 'GET_NAME', input: 'שו איסמק?', lang: 'ar', expected: false }, // "What is your name?" - Objection/Question
        { step: 'DATA_COLLECTION_PURPOSE', input: 'בנאא בית (Building a house)', lang: 'ar', expected: true },

        // Russian Scenarios
        { step: 'GET_NAME', input: 'Alexei Volkov', lang: 'ru', expected: true },
        { step: 'GET_NAME', input: 'Niet', lang: 'ru', expected: false },

        // Edge Cases
        { step: 'QUALIFICATION', input: '500000', lang: 'he', expected: true }, // Valid amount
        { step: 'QUALIFICATION', input: 'אני סתם בודק', lang: 'he', expected: false }, // "Just checking" - Objection
        { step: 'RISK_CHECK', input: 'הכל נקי', lang: 'he', expected: true },
        { step: 'RISK_CHECK', input: 'מה אכפת לך?', lang: 'he', expected: false }
    ];

    for (let i = 0; i < scenarios.length; i++) {
        const s = scenarios[i];
        const passed = await runScenario(i + 1, s.step, s.input, s.lang, s.expected);
        if (passed) passedCount++;
        // Small delay to avoid hitting rate limits instantly
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\nResults: ${passedCount}/${scenarios.length} Scenarios Passed.`);
}

runScaleTests();
