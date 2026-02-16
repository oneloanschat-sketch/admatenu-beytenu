const axios = require('axios');

async function testLiveWebhook() {
    console.log("🚀 Simulating Incoming Webhook (User: 'Hi')...");

    // Payload matching UltraMsg format
    const payload = {
        data: {
            id: "msg_test_123",
            from: "972500000000@c.us", // Test number
            to: "972586554588@c.us",
            author: "972500000000@c.us",
            pushname: "TestUser",
            ack: "",
            type: "chat",
            body: "Hi", // The trigger message
            fromMe: false,
            isGroup: false,
            time: Math.floor(Date.now() / 1000)
        },
        event_type: "message_received",
        instanceId: "instance161934"
    };

    try {
        const res = await axios.post('https://admatenu-beytenu-chatbot.onrender.com/webhook', payload);
        console.log(`✅ Webhook Accepted: Status ${res.status}`);
        console.log("👉 Now check the Render logs (if possible) or wait for a WhatsApp on the Admin phone.");
    } catch (e) {
        console.error("❌ Webhook Failed:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
    }
}

testLiveWebhook();
