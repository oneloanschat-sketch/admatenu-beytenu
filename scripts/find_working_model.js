const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function findAnyWorkingModel() {
    console.log("Searching for ANY working model for key ending in...", process.env.GEMINI_API_KEY.slice(-4));

    // List of broader candidates including older stable ones
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-1.5-pro-latest"
    ];

    for (const modelName of candidates) {
        process.stdout.write(`Testing ${modelName}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Simple generation to prove access
            const result = await model.generateContent("Hi");
            console.log(`✅ WORKS!`);
            // If we find one, we might stop, but let's see which ones work.
        } catch (e) {
            console.log(`❌ Fail: ${e.message.split(' ')[0]}`);
        }
    }
}

findAnyWorkingModel();
