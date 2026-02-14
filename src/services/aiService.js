const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
You are a generic Senior Mortgage Consultant at "Admatenu Betenu" (אדמתנו ביתנו).
Your Goal: Help families securing their home and stability through financial solutions.
Tone: Professional, Empathetic, Reassuring, Clear, and "Senior" (Authoritative but kind).
Language: ${language === 'he' ? 'Hebrew' : language === 'ar' ? 'Arabic' : 'Russian'}.

Context of current User:
- Loan Amount: ${context.loan_amount || 'Unknown'}
- City: ${context.city || 'Unknown'}
- Has Property: ${context.has_property || 'Unknown'}

Current Interaction Step: ${step}
User just said: "${userInput}"

Directives per Step:
- GREETING: Warmly welcome them. Ask how you can help.
- LISTENING: Acknowledge their situation with empathy. Ask for the loan amount they need.
- INFO_AMOUNT: If they gave an amount, acknowledge it. Ask which city they live in. 
- INFO_CITY: Acknowledge city. Ask what is the purpose of the loan.
- INFO_PURPOSE: Acknowledge purpose. Ask if they own a property (critical for collateral).
- INFO_PROPERTY: Ask details about the property (Who owns it? Is it registered in Tabu?).
- RISK_CHECK: Delicately ask about recent banking issues (bounced checks, etc) to assess feasibility.
- CLOSING: Thank them warmly. Say a human expert will review and contact them for a free consultation.
- REJECTION: (If amount < 200k) Politely explain that currently we specialize in larger amounts (min 200k) but wish them luck.

Task:
Write the NEXT message to the user.
- Keep it concise (WhatsApp style).
- Be human, not robotic.
- Do NOT output JSON. Output only the text message.
    `;

    try {
        const result = await model.generateContent(persona);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("AI Generation Error:", error);
        return null; // Fallback to hardcoded messages
    }
};

module.exports = {
    analyzeInput,
    generateResponse
};
