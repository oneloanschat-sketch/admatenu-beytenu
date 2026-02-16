const Groq = require('groq-sdk');
require('dotenv').config();

async function listModels() {
    console.log("Fetching Groq Models...");
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const models = await groq.models.list();

        console.log("\n--- AVAILABLE GROQ 70B MODELS ---");
        models.data.forEach(m => {
            if (m.id.includes("70b")) {
                console.log(`ID: ${m.id}`);
            }
        });
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
