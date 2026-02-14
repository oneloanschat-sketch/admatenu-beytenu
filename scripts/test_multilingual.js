require('dotenv').config();
const aiService = require('../src/services/aiService');

async function testMultilingual() {
    console.log("Testing AI generation for ARABIC...");
    const textArabic = await aiService.generateResponse('GREETING', 'מחרבא (Marhaba)', { full_name: 'Unknown' }, 'ar');
    console.log("Output (Arabic Context):", textArabic);
    console.log("---------------------------------------------------");

    console.log("Testing AI generation for RUSSIAN...");
    const textRussian = await aiService.generateResponse('GREETING', 'Privet (Hello)', { full_name: 'Unknown' }, 'ru');
    console.log("Output (Russian Context):", textRussian);
    console.log("---------------------------------------------------");
}

testMultilingual();
