require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // For Google AI Studio (generative-ai SDK)
    // Note: listModels might not be directly exposed easily in all versions of the simple SDK, 
    // but typically we can try to retrieve a model or just use a known one. 
    // However, the error message from the previous step suggested: "call ListModels to see the list".
    // This implies the SDK supports falling back or the error message came from the API itself.

    // Let's try to infer from a standard request or just print the key details we have.
    // Actually, the SDK doesn't always have a straightforward `listModels()` method exposed on the entry point in all versions.
    // But let's try assuming the user has a valid key.

    console.log("Attempting to list models (if supported) or testing standard models...");

    const checkModel = async (modelName) => {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`✅ Model '${modelName}' is AVAILABLE.`);
            return true;
        } catch (error) {
            console.log(`❌ Model '${modelName}' is NOT available.`);
            console.error(`Full Error:`, error);
            return false;
        }
    };

    const modelsToCheck = [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-ultra",
        "gemini-3.0-pro" // Checking the user's request
    ];

    console.log("Checking specific models...");
    for (const m of modelsToCheck) {
        await checkModel(m);
    }
}

listModels();
