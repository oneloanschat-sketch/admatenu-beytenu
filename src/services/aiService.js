const Groq = require('groq-sdk');
require('dotenv').config();

const MODEL = "llama-3.3-70b-versatile";

let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
            timeout: 20000 // 20s timeout to prevent hanging
        });
        console.log("Groq AI Initialized with model:", MODEL);
    } else {
        console.warn("GROQ_API_KEY not found. AI features disabled.");
    }
} catch (e) {
    console.error("Failed to initialize Groq:", e);
}

// Helper: Infinite Retry Loop (Wait until available)
const generateWithRetryLoop = async (messages, jsonMode = false) => {
    if (!groq) return null;

    let attempt = 0;
    let delay = 1000; // Start with 1 second

    while (true) {
        attempt++;
        let params = {};
        try {
            params = {
                messages: messages,
                model: MODEL,
                temperature: 0.3, // Lowered from 0.7 to 0.3 for more deterministic/professional responses
                max_tokens: 1024,
            };

            // Only add response_format if jsonMode is true
            if (jsonMode) {
                params.response_format = { type: "json_object" };
            }

            const completion = await groq.chat.completions.create(params);
            return completion.choices[0]?.message?.content || "";
        } catch (error) {
            console.warn(`⚠️ Groq Error (Attempt ${attempt}): ${error.message}`);
            if (error.response) console.warn("API Response Details:", JSON.stringify(error.response.data, null, 2));
            console.warn("Request Params:", JSON.stringify(params, null, 2));

            // If it's a 400 error (Bad Request), it might be context length or invalid structure. Don't retry infinitely.
            if (error.status === 400) {
                console.error("Fatal 400 Error from Groq. Returning null.");
                return null;
            }

            console.log(`⏳ Groq Unavailable/RateLimit. Waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.5, 10000); // Cap at 10s
        }
    }
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

const analyzeInput = async (userInput, step, language = 'he') => {
    if (!groq) return null;

    let systemPrompt = "You are a financial assistant. Extract data as JSON.";
    let userPrompt = `User Input: "${userInput}"`;

    if (step === 'QUALIFICATION') {
        systemPrompt += `
Task: Extract loan amount in NIS.
Rules: "half a million" = 500000, "200k" = 200000.
Return JSON: { "amount": number | null }`;
    } else if (step === 'PROPERTY_OWNERSHIP') {
        systemPrompt += `
Task: Determine if user owns property (Yes/No).
Return JSON: { "has_property": boolean | null }`;
    } else {
        return null; // No analysis needed for other steps yet
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const text = await generateWithRetryLoop(messages, true); // JSON Mode
    return parseAiJson(text);
};

const generateResponse = async (step, userInput, context = {}, language = 'he') => {
    if (!groq) return null;

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
        'CLOSING': 'Thank them, mention an expert will analyze the data, and ask "When is convenient for us to call?" and wish "Lovely day".',
        'ANYTHING_ELSE': 'Ask if there is anything else they want to add. If they said "No" or finished, proceed to closing.'
    };

    const currentDirective = stepDirectives[step] || 'Respond naturally and helpfuly.';

    const systemPrompt = `
System Role: Admatenu Betenu - Financial AI Agent No. 1
Location: 1 Haifa St., Daliyat al-Karmel.
Role: Expert agent for credit solutions, mortgages, and debt consolidation.
Tone: Very human, warm, respectful, empathetic, and professional.

Iron Rules:
* LANGUAGE PRIORITY: PROCEED IN HEBREW (עברית) BY DEFAULT. Only switch if the user explicitly types in Arabic, Russian, or English.
* NEVER mention specific representative names: Always speak as "The Professional Team".
* Humanity First: You MUST ask "How are you?" at the beginning.
* One Question at a Time: NEVER send more than one question in a single message.
* Tone: Professional, warm, Israeli style ("Tachles" but polite).

Cultural Magic Words (Use carefully):
• Hebrew: "Tachles", "Be'ahava", "Hakool Tov".
• Arabic: "Ahlan wa Sahlan", "Alhamdulillah".
• Russian: "Nadezhnost", "Poryadok".

Flow Guidelines:
1. GREETING: "Shalom, thank you for contacting Admatenu Betenu. We are here to help. First of all - How are you today?"
2. GET_NAME: Ask for full name.
3. LISTENING: Ask "How can we help?".
4. CITY: Ask for city.
5. AMOUNT: Ask for loan amount (>200k focus).
6. PURPOSE: Renovation/Debt/Asset?
7. PROPERTY_OWNERSHIP: Do you own property?
8. PROPERTY_DETAILS: Who owns it? Tabu? Permit?
9. RISK_CHECK: BDI/Checks/Bank issues?
10. ANYTHING_ELSE: Anything else to add?
11. CLOSING: "Thank you. Experts will analyze. When is convenient to call? Lovely day."

Current Context:
Name: ${context.full_name || 'Unknown'}
City: ${context.city || 'Unknown'}
Amount: ${context.loan_amount || 'Unknown'}
Property: ${context.has_property || 'Unknown'}
Language: ${language}

Task:
Write the NEXT message to the user based on the Current Step: "${step}" and Directive: "${currentDirective}".
User Input: "${userInput}"

Constraints:
- IF Step="GREETING": Output EXACTLY: "שלום, תודה שפנית לאדמתנו ביתנו. אנחנו כאן כדי לעזור. לפני הכל - מה שלומך היום?"
- IF Step="CLOSING": Must ask "When to call?"
- NO JSON. Just the text message.
    `;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
    ];

    const text = await generateWithRetryLoop(messages, false); // Text Mode
    console.log(`[Groq] Step: ${step}, Input: "${userInput}" -> Output: "${text}"`);
    return text;
};

const validateInput = async (userInput, step, language = 'he') => {
    if (!groq) return { isValid: true };

    const systemPrompt = `
Task: Validate User Input for Chatbot.
CRITICAL: The "suggestedResponse" MUST BE IN HEBREW (עברית).

Return JSON: { "isValid": boolean, "reason": string, "suggestedResponse": string (optional) }

Context: Step "${step}".
Rules:
- GET_NAME: Allow first names like "יוני" or full names. Reject nonsense.
- General: If invalid, provide a polite Hebrew suggested response explaining why.

Examples:
- Step: GET_NAME, Input: "Pizza" -> { "isValid": false, "suggestedResponse": "סליחה, לא הבנתי. תוכל בבקשה לכתוב את שמך המלא?" }
- Step: GET_NAME, Input: "Yoni" -> { "isValid": true }
    `;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Input: "${userInput}"` }
    ];

    const text = await generateWithRetryLoop(messages, true); // JSON Mode
    const json = parseAiJson(text);
    console.log(`[Validation] Step: ${step}, Valid: ${json?.isValid}`);
    return json || { isValid: true };
};

const processStep = async (step, userInput, context = {}, language = 'he') => {
    // 1. Validate Input (if needed)
    // Some steps like GREETING don't need validation of user input (it's the first run)
    // But for GET_NAME, etc., we validate.

    if (step !== 'GREETING' && step !== 'CLOSING') {
        const validation = await validateInput(userInput, step, language);
        if (validation && !validation.isValid) {
            return {
                isValid: false,
                response: validation.suggestedResponse || "Something went wrong, please try again."
            };
        }
    }

    // 2. Analyze Input (Extract data)
    // We can do this here or let flowService do it. 
    // FlowService seems to assume processStep handles it or it does it manually?
    // In flowService line 292: session.data.full_name = messageBody; -> It takes raw body.
    // So we just need to generate the NEXT response.

    // 3. Generate Next Response
    const nextResponse = await generateResponse(step, userInput, context, language);

    return {
        isValid: true,
        response: nextResponse,
        data: {} // In future we can modify this to return extracted data
    };
};

module.exports = {
    analyzeInput,
    generateResponse,
    validateInput,
    processStep
};
