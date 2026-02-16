require('dotenv').config();
console.error("--- DEBUG SCRIPT STARTED ---");
const aiService = require('../src/services/aiService');

async function debugGetName() {
    console.log("Debugging GET_NAME Step with input 'יוני ווייט'...");

    const step = 'GET_NAME';
    const userInput = 'יוני ווייט';
    const context = {};
    const lang = 'he';
    const history = [
        { role: 'assistant', content: 'שלום, תודה שפנית לאדמתנו ביתנו. אנחנו כאן כדי לספק את הפתרונות הטובים ביותר עבורך. לפני שנתקדם – מה שלומך היום?' },
        { role: 'user', content: 'מעולה' },
        { role: 'assistant', content: 'שמח לשמוע. כדי שנוכל לדבר בצורה אישית, איך קוראים לך?' }
    ];

    try {
        const res = await aiService.processStep(step, userInput, context, lang, history);
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Crash:", e);
    }
}

debugGetName();
