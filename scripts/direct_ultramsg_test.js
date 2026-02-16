const axios = require('axios');

const INSTANCE_ID = "instance161934";
const TOKEN = "osolav23hx438plx";
const TO = "972586554588";

async function testDirect() {
    console.log("Testing Direct UltraMsg Call...");
    const url = `https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`;
    const body = {
        token: TOKEN,
        to: TO,
        body: "Direct Test Message 🚀",
        priority: 10
    };

    try {
        const res = await axios.post(url, body, { timeout: 10000 });
        console.log("✅ Success:", res.data);
    } catch (e) {
        console.error("❌ Failed:", e.message);
        if (e.response) {
            console.error("Response:", e.response.data);
        }
    }
}

testDirect();
