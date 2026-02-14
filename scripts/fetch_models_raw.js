require('dotenv').config();

async function listModelsRaw() { // Renamed from file_fetch_models.js to be consistent with content but distinct
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log("⚠️ No models found in response:", data);
            return;
        }

        console.log("✅ Available Models:");
        data.models.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
            console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
        });

    } catch (error) {
        console.error("❌ Network/Fetch Error:", error);
    }
}

listModelsRaw();
