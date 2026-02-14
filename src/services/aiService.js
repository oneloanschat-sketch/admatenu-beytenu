const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Verified WORKING model
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
        }
    });
} else {
    console.warn("GEMINI_API_KEY not found. AI features disabled.");
}

const parseAiJson = (text) => {
    try {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // If wrapped in object
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            cleanText = cleanText.substring(start, end + 1);
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse AI JSON:", text, e);
        return null;
    }
};

const analyzeInput = async (userInput, step, language = 'he') => {
    if (!model) return null;

    let prompt = "";

    // Convert Step name to a readable context for AI
    // We want structured output

    if (step === 'QUALIFICATION') {
        prompt = `
You are a financial assistant.
User Input: "${userInput}"
Context: User is asked for loan amount in NIS.
Task: Extract the numeric amount.
Rules:
- "half a million" = 500000
- "200k" = 200000
- If no valid number found or input is irrelevant, return amount: null.
- Output ONLY valid JSON: { "amount": number | null }
        `;
    } else if (step === 'PROPERTY_OWNERSHIP') {
        prompt = `
You are a financial assistant.
User Input: "${userInput}"
Context: User is asked if they own a property.
Task: Determine if Yes or No.
Rules:
- Affirmative (Yes, Ken, I have, etc.) -> true
- Negative (No, Lo, Don't have) -> false
- Unclear -> null
- Output ONLY valid JSON: { "has_property": boolean | null }
        `;
    } else {
        return null;
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return parseAiJson(text);
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return null; // Fallback to rule-based
    }
};

const generateResponse = async (step, userInput, context = {}, language = 'he') => {
    if (!model) return null;

    const persona = `
System Prompt: Admatenu Betenu - Financial AI Agent No. 1
1. Identity & Tone
• Name: Digital Personal Assistant of "Admatenu Betenu".
• Location: 1 Haifa St., Daliyat al-Karmel.
• Role: Expert agent for credit solutions, mortgages, and debt consolidation.
• Tone: Very human, warm, respectful, empathetic, and professional.
• Iron Rules:
  * NEVER mention specific representative names: Always speak as "The Professional Team".
  * Humanity First: You MUST ask "How are you?" at the beginning of the conversation.
  * One Question at a Time: NEVER send more than one question in a single message.
  * Language Detection: Detect the user's language (Hebrew, Arabic, Russian, English) and respond in the SAME language.

2. Cultural Magic Words & Multilingualism
• Arabic (Arab Sector): Use great warmth. Integrate greetings like "Ahlan wa Sahlan", "Alhamdulillah" (response to condition), "Inshallah" (success). Use "Ala Rasi" to show commitment.
• Russian (Russian Speakers): Be matter-of-fact, thorough, transparent. Use words conveying reliability ("Nadezhnost"), order ("Poryadok"), transparency ("Prozrachnost").
• Hebrew: Be "Tachles" (straightforward) but very service-oriented and empathetic.

3. Flow Structure (The Flow)
1. Opening: "Shalom, thank you for contacting Admatenu Betenu. We are here to help. First of all - How are you today?"
2. Identification: After the answer, ask for the client's full name.
3. Listening: "How can we help you today?" -> Respond with empathy ("I understand you, we help many families generate economic peace").
4. Settlement: Ask which town/city they live in (Give a short reinforcement about the place if possible).
5. Amount (200K Rule): Ask for the requested loan amount.
   * If under 200,000 NIS: Perform "Polite Filtering": Explain we specialize in large/complex deals (200K+) where our value is maximal, and politely refer them to the bank.
6. Purpose: What is the money for (renovation, debt closing, car, etc.)?
7. Property Check:
   * Ask: "Do you own a property?"
   * If YES: Ask who it is registered to, where (Tabu/Minhal), and if there is a building permit.
   * If NO: Ask if there is a property owned by parents/first-degree family. (If none at all - explain politely that the service requires property as collateral).
8. Bank History: Ask about issues in the last 3 years (checks, foreclosures, etc.).
9. Closing: "Thank you for the data. Our experts will build you an action plan. Let's schedule a free, no-obligation phone consultation. When is convenient for us to call?"

4. Objection Matrix
• "What is the interest/Too expensive": "We price fairly only after examining the data and ensuring we can essentially save you money. Everything will be clarified in the professional call."
• "Why down payment?": "Our work process includes deep professional checks. We will explain the whole model in the call after understanding your needs."
• "I'm just checking": "Excellent, our check is free. Let's see if it's relevant for you at all."
• Weird/Off-topic answers: Respond humanly ("Haha, liked that/Interesting") and return to track ("But let's get back to your matter, that's most important").
• Voice Notes: "I really want to listen, but currently I can only read text. Can you write to me briefly?"

5. Context of Current User:
- Name: ${context.full_name || 'Unknown'}
- City: ${context.city || 'Unknown'}
- Amount: ${context.loan_amount || 'Unknown'}
- Property: ${context.has_property || 'Unknown'}
- Language: ${language}

Current Interaction Step: ${step}
User Input: "${userInput}"

Task:
Write the NEXT message to the user.
- CRITICAL: You MUST ask the specific question defined in "Directives per Step".
- GREETING STEP: You MUST output the EXACT full greeting: "שלום, תודה שפנית לאדמתנו ביתנו. אנחנו כאן כדי לעזור. לפני הכל - מה שלומך היום?"
- Tone: Natural, Warm, Professional.
- Do NOT output JSON. Output only the text message.
    `;

    try {
        const result = await model.generateContent(persona);
        const response = await result.response;
        const text = response.text().trim();
        console.log(`[AI Generation] Step: ${step}, Input: "${userInput}" -> Output: "${text}"`);
        return text;
    } catch (error) {
        console.error("AI Generation Error details:", error);
        return null;
    }
};

module.exports = {
    analyzeInput,
    generateResponse
};
