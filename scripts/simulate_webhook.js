const axios = require('axios');

async function triggerWebhook() {
    console.log("Triggering Production Webhook...");
    try {
        const payload = {
            data: {
                from: "972500000000@c.us", // Test number
                body: "Hi",
                pushName: "TestUser"
            },
            event_type: "message_received"
        };

        const res = await axios.post('https://admatenu-beytenu-chatbot.onrender.com/webhook', payload);
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${JSON.stringify(res.data)}`);
    } catch (e) {
        console.log(`❌ Request Failed: ${e.message}`);
        if (e.response) {
            console.log(`Status: ${e.response.status}`);
            console.log(`Data: ${JSON.stringify(e.response.data)}`);
        }
    }
}

triggerWebhook();
