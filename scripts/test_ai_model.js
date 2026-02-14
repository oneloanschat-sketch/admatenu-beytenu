require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }

    console.log("Checking key ending in:", apiKey.slice(-4));

    const modelName = "gemini-3.0-pro"; // Testing the requested model
    console.log(`Testing connectivity for model: ${modelName}...`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent("Say 'Hello System Check' if you can hear me.");
        const response = await result.response;
        const text = response.text();

        console.log("✅ Success! Model response:", text);
    } catch (error) {
        console.error("❌ AI Test Failed!");
        console.error("Error Message:", error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));

        console.log("\n--- Retrying with gemini-1.5-pro ---");
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent("Say 'Hello System Check 1.5' if you can hear me.");
            const response = await result.response;
            console.log("✅ gemini-1.5-pro Success! Response:", response.text());
        } catch (e) {
            console.error("❌ gemini-1.5-pro also failed:", e.message);
        }
    }
}

testModel();
