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

module.exports = {
    analyzeInput
};
