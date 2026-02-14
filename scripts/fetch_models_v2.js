const fs = require('fs');
require('dotenv').config();

async function listModelsRaw() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        fs.writeFileSync('models_v2.txt', "❌ GEMINI_API_KEY is missing in .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            fs.writeFileSync('models_v2.txt', `❌ API Error: ${JSON.stringify(data.error, null, 2)}`);
            return;
        }

        if (!data.models) {
            fs.writeFileSync('models_v2.txt', `⚠️ No models found in response: ${JSON.stringify(data)}`);
            return;
        }

        let output = "✅ Available Models:\n";
        data.models.forEach(m => {
            output += `- ${m.name.replace('models/', '')}\n`;
        });

        fs.writeFileSync('models_v2.txt', output);
        console.log("Models list saved to models_v2.txt");

    } catch (error) {
        fs.writeFileSync('models_v2.txt', `❌ Network/Fetch Error: ${error.message}`);
    }
}

listModelsRaw();
