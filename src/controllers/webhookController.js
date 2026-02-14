const flowService = require('../services/flowService');

exports.handleWebhook = async (req, res) => {
    try {
        const { data } = req.body;

        if (data && data.from && data.body) {
            const phoneNumber = data.from;
            const messageBody = data.body;

            // Process the message through the flow service
            await flowService.processMessage(phoneNumber, messageBody);
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
