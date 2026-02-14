const axios = require('axios');

const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
const token = process.env.ULTRAMSG_TOKEN;

const sendMessage = async (to, body) => {
    if (!instanceId || !token) {
        console.log(`[MOCK] Sending message to ${to}: ${body}`);
        return;
    }

    try {
        const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            token: token,
            to: to,
            body: body,
            priority: 10
        });
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = {
    sendMessage,
};
