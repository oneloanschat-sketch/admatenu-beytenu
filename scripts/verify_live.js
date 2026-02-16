const axios = require('axios');

async function checkHealth() {
    try {
        console.log("Pinging Production Webhook...");
        const res = await axios.post('https://admatenu-beytenu-chatbot.onrender.com/webhook', {
            data: { from: "972500000000@c.us", body: "Ping", pushName: "Tester" },
            event_type: "message_received"
        });
        console.log(`Status: ${res.status}`);
        if (res.status === 200) console.log("✅ Server is reachable & processing webhooks.");
    } catch (e) {
        console.error("❌ Health Check Failed:", e.message);
    }
}

checkHealth();
