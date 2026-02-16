const Groq = require('groq-sdk');
require('dotenv').config();

const MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES = 3;

// --- PROMPTS & CONFIGURATION ---
const SYSTEM_IDENTITY = `
System Role: "Admatenu Beytenu" (أرضنا بيتنا) - A Senior Financial House & Consultancy.
Identity: We are "The Professional Team". We are NOT aggressive salespeople; we are financial guardians for the family.
Mission: To provide stability, security, and professional financing solutions, primarily for the Arab sector.
Tone: Respected, Responsible, Stable, Warm but Professional ("Bayt Mali").
      - We do NOT pressure the client.
      - We do NOT sell illusions or promise "magic".
      - We speak with dignity and responsibility.

Iron Rules:
1. LANGUAGE: Hebrew (Default). Switch to Arabic/Russian/English only if the user speaks it.
2. LIMITS: We strictly handle credit/loans above 200,000 NIS. Below this is "unsafe" or "not our focus".
3. PROPERTY: We ONLY work with Property Owners (Self or First-Degree Family). This is a core requirement for security.
4. HONESTY: Never promise 100% success. Use phrases like "We will examine", "We will check feasibility".
5. FLOW: Ask ONE question at a time. Do not overwhelm the client.
6. STICK TO DIRECTIVE: You must ONLY ask what is requested in the "Directive". Do NOT invent new stages (like "sending emails", "detailed proposals", or "asking for bank account details").

Task:
Analyze the User Input for the current Step.
1. VALIDATE: Is the input relevant and valid for this step? (Reject gibberish).
2. EXTRACT: If there are specific data points (Name, Amount, City), extract them.
3. RESPOND: Generate the next natural response based on the Step Directive.
   - CRITICAL: Your response MUST reflect the "Directive". Do not ignore it.
`;

const STEP_DIRECTIVES = {
    'GREETING': 'Welcome the user and ask "How are you?".',
    'GET_NAME': 'Acknowledge, then ask for full name.',
    'DATA_COLLECTION_CITY': 'Say "Nice to meet you [Name]", then ask which town/city they live in.',
    'QUALIFICATION': 'Ask for the requested loan amount (in NIS). RULES: Extract amount. Reject if < 200k in the response (politely).',
    'DATA_COLLECTION_PURPOSE': 'Ask what the money is for.',
    'PROPERTY_OWNERSHIP': 'Ask if they own a property. Extract: has_property (boolean).',
    'PROPERTY_OWNERSHIP_WHO': 'Ask whose name the property is registered on (Self, Spouse, Both).',
    'PROPERTY_LOCATION': 'Ask where the property is registered (Tabu, Minhal, etc.).',
    'PROPERTY_PERMIT': 'Ask if there is a Building Permit.',
    'FAMILY_PROPERTY': 'Ask if there is a property owned by parents or first-degree family.',
    'FAMILY_PROPERTY_PERMIT': 'Ask if the family property has a Building Permit.',
    'RISK_CHECK': 'Ask about bank history (BDI) in the last 3 years.',
    'CLOSING': 'State that details have been passed to a representative, and ask "When is convenient to call?".'
};

let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
            timeout: 20000
        });
        console.log("Groq AI Initialized with model:", MODEL);
    } else {
        console.warn("GROQ_API_KEY not found. AI features disabled.");
    }
} catch (e) {
    console.error("Failed to initialize Groq:", e);
}

// --- HELPER FUNCTIONS ---

const generateWithRetry = async (messages, jsonMode = false) => {
    if (!groq) return null;

    let attempt = 0;
    let delay = 1000;

    while (attempt < MAX_RETRIES) {
        attempt++;
        let params = {};
        try {
            params = {
                messages: messages,
                model: MODEL,
                temperature: 0.3,
                max_tokens: 1024,
            };

            if (jsonMode) {
                params.response_format = { type: "json_object" };
            }

            const completion = await groq.chat.completions.create(params);
            return completion.choices[0]?.message?.content || "";
        } catch (error) {
            console.warn(`⚠️ Groq Error (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

            if (error.status === 400 || error.status === 401) {
                console.error("Fatal API Error (400/401). Stopping retries.");
                return null;
            }

            if (attempt >= MAX_RETRIES) {
                console.error("❌ Max Retries Reached. Giving up.");
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.5, 5000);
        }
    }
    return null;
};

const parseAiJson = (text) => {
    if (!text) return null;
    try {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            cleanText = cleanText.substring(start, end + 1);
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse AI JSON:", text);
        return null;
    }
};

// --- MAIN LOGIC ---

/**
 * Unified Processor: Validates, Extracts, and Responds in ONE call.
 */
const processStep = async (step, userInput, context = {}, language = 'he', history = []) => {
    // Fail gracefully if AI is not initialized
    if (!groq) {
        console.error("❌ Groq AI Invalid/Missing API Key");
        return {
            isValid: false,
            response: language === 'he' ? "אירעה תקלה זמנית בחיבור למוח המערכת. אנא נסה שוב מאוחר יותר." : "System Error: AI Unavailable.",
            data: {}
        };
    }

    // Construct the Prompt
    const currentDirective = STEP_DIRECTIVES[step] || 'Respond naturally.';

    const userPrompt = `
Current Step: "${step}"
Directive: "${currentDirective}"
User Input: "${userInput}"
Target Language: ${language === 'he' ? 'Hebrew (עברית)' : language}
Context: ${JSON.stringify(context)}

OUTPUT FORMAT (JSON ONLY):
{
    "isValid": boolean, // Is the user input relevant/valid?
    "reason": string, // Reason if invalid
    "response": string, // The text response to send to the user (in Target Language)
    "data": object // Extracted fields (e.g., amount, city, has_property)
}
    `;

    // Clean History (Only last 5 messages to save tokens/complexity)
    const recentHistory = history.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const messages = [
        { role: "system", content: SYSTEM_IDENTITY },
        ...recentHistory,
        { role: "user", content: userPrompt }
    ];

    const resultText = await generateWithRetry(messages, true); // JSON Mode
    const resultJson = parseAiJson(resultText);

    if (!resultJson) {
        return {
            isValid: false,
            response: language === 'he' ? "אירעה שגיאה זמנית במערכת, אנא נסו שנית." : "System temporary error, please try again.",
            data: {}
        };
    }

    // Logging for debugging
    console.log(`[AI] Step: ${step} | Valid: ${resultJson.isValid} | Data:`, resultJson.data);

    return {
        isValid: resultJson.isValid,
        response: resultJson.response || "...",
        data: resultJson.data || {}
    };
};

// Legacy exports if needed, but processStep is the main one now.
module.exports = {
    processStep
};
