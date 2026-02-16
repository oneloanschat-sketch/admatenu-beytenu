require('dotenv').config();
const aiService = require('../src/services/aiService');
const fs = require('fs');

const LOG_FILE = 'stress_test_results.log';
const CONCURRENT_BATCH_SIZE = 4; // Parallel Execution
const TOTAL_FLOWS = 4; // One of each scenario

console.error("--- SCRIPT STARTED ---"); // Immediate output

const SCENARIOS = [
    {
        name: "Happy Flow - Numbers",
        inputs: {
            GREETING: "שלום",
            GET_NAME: "ישראל ישראלי",
            QUALIFICATION: "500,000",
            DATA_COLLECTION_CITY: "תל אביב",
            DATA_COLLECTION_PURPOSE: "שיפוץ",
            PROPERTY_OWNERSHIP: "כן, יש לי דירה",
            PROPERTY_OWNERSHIP_WHO: "על שמי",
            PROPERTY_LOCATION: "טאבו",
            PROPERTY_PERMIT: "יש היתר",
            RISK_CHECK: "אין בעיות",
            CLOSING: "בבוקר"
        },
        expected: {
            qualification_amount: 500000,
            has_property: true
        }
    },
    {
        name: "Happy Flow - Words",
        inputs: {
            GREETING: "היי",
            GET_NAME: "מוחמד כהן",
            QUALIFICATION: "חצי מיליון שקל",
            DATA_COLLECTION_CITY: "חיפה",
            DATA_COLLECTION_PURPOSE: "סגירת חובות",
            PROPERTY_OWNERSHIP: "יש לי נכס",
            PROPERTY_OWNERSHIP_WHO: "על שמי",
            PROPERTY_LOCATION: "מינהל",
            PROPERTY_PERMIT: "כן",
            RISK_CHECK: "הכל תקין",
            CLOSING: "מחר"
        },
        expected: {
            qualification_amount: 500000,
            has_property: true
        }
    },
    {
        name: "Rejection Flow - Low Amount",
        inputs: {
            GREETING: "שלום",
            GET_NAME: "דני",
            QUALIFICATION: "100,000",
        },
        expected: {
            qualification_amount: 100000,
            must_reject: true
        }
    },
    {
        name: "Complex Flow - Property Parsing",
        inputs: {
            GREETING: "אהלן",
            GET_NAME: "יוסי",
            QUALIFICATION: "300000",
            DATA_COLLECTION_CITY: "ירושלים",
            DATA_COLLECTION_PURPOSE: "משכנתא",
            PROPERTY_OWNERSHIP: "אין לי כלום",
            // Should fork to FAMILY_PROPERTY logic if implemented in flow service, 
            // but AI service just extracts has_property=false
        },
        expected: {
            qualification_amount: 300000,
            has_property: false
        }
    }
];

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

async function runStep(step, input, context = {}) {
    try {
        const start = Date.now();
        const res = await aiService.processStep(step, input, context, 'he', []);
        const duration = Date.now() - start;
        return { ...res, duration };
    } catch (e) {
        return { isValid: false, response: "ERROR_EXCEPTION", error: e.message };
    }
}

async function runFlow(scenario, id) {
    log(`START Flow ${id}: ${scenario.name}`);
    let context = {};
    let passed = true;
    let failureReason = "";

    const steps = Object.keys(scenario.inputs);

    for (const step of steps) {
        const input = scenario.inputs[step];
        const res = await runStep(step, input, context);

        if (!res.isValid) {
            // Note: Rejection might come as valid=true response, logic is in flowService usually.
            // But if AI fails to parse, it returns valid=false.
            // If the script fails due to technical error, isValid=false.
            passed = false;
            failureReason = `Step ${step} failed/invalid: ${res.response}`;
            log(`  [${id}] FAIL ${step} (${res.duration}ms): ${res.response}`);
            break;
        }

        log(`  [${id}] OK ${step} (${res.duration}ms) -> AI: "${res.response.substring(0, 50)}..."`);

        // Update context with data
        if (res.data) Object.assign(context, res.data);

        // Check Expectations
        if (step === 'QUALIFICATION') {
            const returnedAmount = res.data?.amount;
            if (scenario.expected.qualification_amount && returnedAmount !== scenario.expected.qualification_amount) {
                log(`  [${id}] WARNING: Amount mismatch. Expected ${scenario.expected.qualification_amount}, Got ${returnedAmount}`);
            }
            if (scenario.expected.must_reject) {
                // Check if response contains rejection keywords
                if (!res.response.includes("200") && !res.response.includes("מתנצלים") && !res.response.includes("לצערנו")) {
                    log(`  [${id}] WARNING: Rejection expected but response looks generic.`);
                }
            }
        }

        // Simulate delay between steps
        await new Promise(r => setTimeout(r, 500));
    }

    if (passed) {
        log(`END Flow ${id}: SUCCESS`);
    } else {
        log(`END Flow ${id}: FAILED - ${failureReason}`);
    }
    return { passed, failureReason };
}

async function main() {
    fs.writeFileSync(LOG_FILE, "--- STRESS TEST STARTED ---\n");
    let results = { success: 0, failed: 0 };

    // Create random list of flows
    let queue = [];
    for (let i = 0; i < TOTAL_FLOWS; i++) {
        const scenario = SCENARIOS[i % SCENARIOS.length];
        queue.push({ scenario, id: i + 1 });
    }

    // Process in batches
    for (let i = 0; i < queue.length; i += CONCURRENT_BATCH_SIZE) {
        const batch = queue.slice(i, i + CONCURRENT_BATCH_SIZE);
        await Promise.all(batch.map(async (item) => {
            const res = await runFlow(item.scenario, item.id);
            if (res.passed) results.success++;
            else results.failed++;
        }));
    }

    log(`\n--- SUMMARY ---`);
    log(`Total Flows: ${TOTAL_FLOWS}`);
    log(`Success: ${results.success}`);
    log(`Failed: ${results.failed}`);
    log(`See ${LOG_FILE} for full details.`);
}

main();
