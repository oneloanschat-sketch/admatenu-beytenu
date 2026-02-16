require('dotenv').config();
console.error("--- FALLBACK TEST STARTED ---");
const Groq = require('groq-sdk');

// Test with a faster/lighter model
const FALLBACK_MODEL = "llama-3.1-8b-instant";

async function testFallback() {
    console.log(`Testing with model: ${FALLBACK_MODEL}`);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    try {
        const start = Date.now();
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Say hello" }],
            model: FALLBACK_MODEL,
        });
        const duration = Date.now() - start;
        console.log(`Success! Response: ${completion.choices[0].message.content}`);
        console.log(`Duration: ${duration}ms`);
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

testFallback();
