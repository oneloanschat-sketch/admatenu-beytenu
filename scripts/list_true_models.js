const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    console.log("Fetching available models...");
    try {
        // Use the model service to list models
        // Note: The SDK might not expose listModels directly on genAI instance in all versions, 
        // but typically it's under the client. Let's try the standard way or a direct fetch if needed.
        // Actually, for google-generative-ai node SDK:
        // There isn't a direct 'listModels' helper on the top level in some versions, 
        // but we can try a simple generation on known candidates to confirm them.
        // BETTER: Use the REST API to list models to be 100% sure.

        const key = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

        const response = await fetch(url);
        const data = await response.json();

        const fs = require('fs');
        if (data.models) {
            let output = "--- AVAILABLE MODELS ---\n";
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    output += `Name: ${m.name.replace('models/', '')}\n`;
                    output += `   Disp: ${m.displayName}\n`;
                    output += `   Limit: ${JSON.stringify(m.inputTokenLimit)} tags\n`;
                    output += "-------------------------\n";
                }
            });
            fs.writeFileSync('available_models.txt', output);
            console.log("Model list written to available_models.txt");
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
