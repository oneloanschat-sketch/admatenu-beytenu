const { GoogleGenerativeAI } = require("@google/generative-ai");

// Model priority list (Prioritizing Higher RPM limits)
// Based on tests: gemini-2.0-flash exists (hit rate limit), gemini-2.5-flash works.
// Model priority list (Flash Lite Models Only)
// Verified available models from API list (2026-02-15)
const MODEL_NAMES = [
    "gemini-2.5-flash",             // Standard (RPM: 5) - High performance
    "gemini-2.5-flash-lite-preview-02-05", // Lite (RPM: 10) - Higher rate limit? (Need to verify if exists, user list truncated)
    // Fallback to standard flash if lite is missing in list, but user metrics showed lite usage.
    // Based on `list_true_models` output, we only saw `gemini-2.5-flash`. 
    // SAFEST BET: Use the one we saw + the lite one user metrics showed usage for.
    "gemini-2.5-flash-lite",
];

let models = [];

// Initialize models
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    models = MODEL_NAMES.map(name => ({
        name: name,
        instance: genAI.getGenerativeModel({
            model: name,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8000,
            }
        })
    }));
    console.log("AI Models initialized:", MODEL_NAMES);
} else {
    console.warn("GEMINI_API_KEY not found. AI features disabled.");
}

// Helper: safe generation with fallback
// Helper: Infinite Retry Loop (Wait until available)
const generateWithRetryLoop = async (prompt) => {
    let attempt = 0;
    let delay = 2000; // Start with 2 seconds

    while (true) {
        attempt++;
        for (const modelObj of models) {
            try {
                // console.log(`Attempt ${attempt}: Trying ${modelObj.name}...`);
                const result = await modelObj.instance.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                const isRateLimit = error.message.includes("429") || error.message.includes("Too Many Requests") || error.message.includes("QuotaExceeded") || error.message.includes("503");
                console.warn(`⚠️ Model ${modelObj.name} failed (Attempt ${attempt}). Error: ${error.message.substring(0, 100)}...`);

                if (error.message.includes("400") && !error.message.includes("Precondition")) {
                    // Log but continue if user insists on "Wait until available"
                }
            }
        }

        // If all models failed this turn, wait and retry.
        console.log(`⏳ AI Unavailable. Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential Backoff with cap
        delay = Math.min(delay * 1.5, 60000); // Verify cap at 60s
    }
};

// Replaces the direct model usage. We export a 'model' object that mimics the SDK's interface.
const model = {
    generateContent: async (prompt) => {
        const text = await generateWithRetryLoop(prompt);
        return {
            response: {
                text: () => text
            }
        };
    }
};

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

    // Map Steps to Explicit Instructions
    const stepDirectives = {
        'GREETING': 'Welcome the user and ask "How are you?". Use the exact full greeting provided in instructions.',
        'GET_NAME': 'Ask for the client\'s full name politey.',
        'LISTENING': 'Acknowledge their response warmly and ask "How can we help you today?".',
        'QUALIFICATION': 'Ask for the requested loan amount (in NIS).',
        'DATA_COLLECTION_CITY': 'Ask which town/city they live in.',
        'DATA_COLLECTION_PURPOSE': 'Ask what the money is for (renovation, debt covering, etc.).',
        'PROPERTY_OWNERSHIP': 'Ask if they own a property.',
        'PROPERTY_DETAILS': 'Ask for property details: Who owns it, Tabu/Minhal status, and Building Permit status.',
        'RISK_CHECK': 'Ask about bank history (BDI) in the last 3 years (checks returned, foreclosures, etc.).',
        'CLOSING': 'Thank them, mention an expert will analyze the data, and ask "When is convenient for us to call?" and wish "Lovely day".'
    };

    const currentDirective = stepDirectives[step] || 'Respond naturally and helpfuly.';

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
Directives for this Step: "${currentDirective}"
User Input: "${userInput}"

Task:
Write the NEXT message to the user.
- CRITICAL: You MUST ask the specific question defined in "Directives per Step".
- IF (and ONLY if) the step is "GREETING": You MUST output the EXACT full greeting: "שלום, תודה שפנית לאדמתנו ביתנו. אנחנו כאן כדי לעזור. לפני הכל - מה שלומך היום?"
- IF the step is "CLOSING": You MUST include "When is convenient for us to call?" and wish them a "Lovely day".
- Tone: Natural, Warm, Professional.
- Do NOT output JSON. Output only the text message.
    `;

    try {
        const result = await model.generateContent(persona);
        const response = await result.response;
        const text = response.text().trim();
        console.log(`[AI Generation]Step: ${step}, Input: "${userInput}" -> Output: "${text}"`);
        return text;
    } catch (error) {
        console.error("AI Generation Error details:", error);
        return null;
    }
};

const validateInput = async (userInput, step, language = 'he') => {
    if (!model) return { isValid: true }; // Fail open if no AI

    const prompt = `
    Task: Validate User Input for a Chatbot Flow.
    Context: The bot is currently at step: "${step}".
    User Input: "${userInput}"
    Language: "${language}"

    Definition of Valid:
    - GET_NAME: Input must be a name or a nickname. (Invalid: "Banana", "No", "Why?").
    - DATA_COLLECTION_CITY: Input must be a city/place name.
    - DATA_COLLECTION_PURPOSE: Input must be a reason for a loan.
    - PROPERTY_DETAILS: Input must be details about a property.
    - GENERAL: If the user asks a relevant question or raises an objection found in the "Objection Matrix", it is INVALID for *progressing*, but valid for *handling*. Return isValid: false and the objection response.
    - NONSENSE: If input is gibberish, jokes, or completely unrelated (e.g., "I like turtles"), it is INVALID.

    Output JSON matches this schema:
    {
        "isValid": boolean, // true if we can proceed to next step. false if we should stay and ask again.
        "reason": string, // Internal reason
        "suggestedResponse": string // IF isValid is false, write a response in the correct language/tone to handle the issue and re-ask the question.
    }
    
    Example 1 (Step: GET_NAME, Input: "David"): { "isValid": true, "reason": "Valid name", "suggestedResponse": null }
    Example 2 (Step: GET_NAME, Input: "Why do you need it?"): { "isValid": false, "reason": "Objection", "suggestedResponse": "Names help us be personal. It's just for our records." }
    Example 3 (Step: GET_NAME, Input: "Pizza"): { "isValid": false, "reason": "Nonsense", "suggestedResponse": "Haha, I like pizza too, but I need your name to continue." }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const json = parseAiJson(text);

        // Log validation for debugging
        console.log(`[Validation] Step: ${step}, Input: "${userInput}", Valid: ${json?.isValid}`);

        return json || { isValid: true }; // Fallback to true if parse fails
    } catch (error) {
        console.error("Validation Error:", error);
        return { isValid: true }; // Fallback to true on error to not block user
    }
};

module.exports = {
    analyzeInput,
    generateResponse,
    validateInput
};
