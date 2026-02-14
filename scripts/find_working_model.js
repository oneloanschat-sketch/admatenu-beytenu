require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function findWorkingModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing");
        return;
    }

    const startModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite-001",
        "gemini-flash-latest",
        "gemini-1.5-flash"
    ];

    console.log(`🔍 Testing ${startModels.length} models to find a working one...`);
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of startModels) {
        process.stdout.write(`Testing ${modelName}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });

            // Set a timeout to avoid hanging
            const resultPromise = model.generateContent("Hello");
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

            const result = await Promise.race([resultPromise, timeoutPromise]);
            const response = await result.response;
            const text = response.text();

            if (text) {
                console.log(`✅ SUCCESS!`);
                console.log(`🎉 Found working model: ${modelName}`);
                console.log(`Response: ${text.trim()}`);

                // Write to file so we can read it from other tools if needed
                const fs = require('fs');
                fs.writeFileSync('working_model.txt', modelName);
                return;
            }
        } catch (error) {
            let errMsg = error.message;
            if (errMsg.includes('404')) errMsg = '404 Not Found';
            if (errMsg.includes('429')) errMsg = '429 Quota Exceeded';
            console.log(`❌ Failed (${errMsg})`);
        }
    }

    console.log("❌ All models failed.");
}

findWorkingModel();
