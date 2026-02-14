const flowService = require('../services/flowService');

exports.handleWebhook = async (req, res) => {
    try {
        const { data, event_type } = req.body;

        console.log('Incoming Webhook Body:', JSON.stringify(req.body, null, 2));

        if (event_type !== 'message_received') {
            console.log(`Ignoring event type: ${event_type}`);
            return res.status(200).send('Ignored event type');
        }

        if (data && data.from && data.body) {
            const phoneNumber = data.from;
            const messageBody = data.body;

            // Check if message is from me (ignore outgoing messages to prevent loops)
            if (data.fromMe) {
                console.log('Ignoring message from self.');
                return res.status(200).send('Ignored self message');
            }

            console.log(`Processing message from ${phoneNumber}: ${messageBody}`);

            // Process the message through the flow service
            await flowService.processMessage(phoneNumber, messageBody);
        } else {
            console.warn('Webhook received but missing data.from or data.body');
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
