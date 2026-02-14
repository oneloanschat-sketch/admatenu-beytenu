const https = require('https');
const fs = require('fs');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    fs.writeFileSync('models_v3.txt', "❌ GEMINI_API_KEY is missing");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                fs.writeFileSync('models_v3.txt', `❌ API Error: ${JSON.stringify(json.error)}`);
            } else if (json.models) {
                let output = "✅ Available Models:\n";
                json.models.forEach(m => output += `- ${m.name.replace('models/', '')}\n`);
                fs.writeFileSync('models_v3.txt', output);
            } else {
                fs.writeFileSync('models_v3.txt', `⚠️ No models found: ${data}`);
            }
        } catch (e) {
            fs.writeFileSync('models_v3.txt', `❌ Parse Error: ${e.message}`);
        }
    });
}).on('error', (e) => {
    fs.writeFileSync('models_v3.txt', `❌ Network Error: ${e.message}`);
});
