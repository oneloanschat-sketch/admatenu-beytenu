require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Admatenu Betenu Chatbot is running!');
});

const webhookController = require('./controllers/webhookController');
app.post('/webhook', webhookController.handleWebhook);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
