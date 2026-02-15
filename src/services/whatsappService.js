const axios = require('axios');

const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
const token = process.env.ULTRAMSG_TOKEN;

const sendMessage = async (to, body) => {
    if (!instanceId || !token) {
        console.log(`[MOCK] Sending message to ${to}: ${body}`);
        return;
    }

    try {
        console.log(`[WhatsApp] Sending to ${to}: "${body.substring(0, 50)}..."`);
        const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            token: token,
            to: to,
            body: body,
            priority: 10
        }, {
            timeout: 10000 // 10s timeout to prevent hanging
        });
        console.log(`[WhatsApp] Sent successfully. ID: ${response.data.id}`);
        return response.data;
    } catch (error) {
        console.error(`[WhatsApp] Send Error: ${error.message}`);
        if (error.response) {
            console.error(`[WhatsApp] API Response:`, JSON.stringify(error.response.data));
        }
        // Don't throw, just log. We don't want to crash the flow.
        return null;
    }
};

module.exports = {
    sendMessage,
};
