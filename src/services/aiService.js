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
                temperature: 0.7,
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
    // Map Steps to the GOAL of the Message we are about to generate
    const stepDirectives = {
        'GREETING': 'Goal: Welcome the user and ask "How are you?" (Use Hebrew: "מה שלומך?").',
        'GET_NAME': 'Goal: Ask for the client\'s full name politey.',
        'LISTENING': 'Goal: Acknowledge the user\'s name warmly, and ask "How can we help you today?".',
        // When processing LISTENING step (User input: "I want a mortgage"), the NEXT goal is QUALIFICATION.
        // But flowService calls processStep('LISTENING').
        // We need to change the directive effectively based on input? No, the AI should bridge.
        // ACTUALLY: The step passed here is the CURRENT state.
        // If state is LISTENING, and user says "Mortgage", we want to move to QUALIFICATION.
        // The AI should: Acknowledge intent -> Ask Amount.
        // So for LISTENING, the directive should be: "User just told you their need. Acknowledge it, and then ask for the requested Loan Amount (in NIS)."

        // REVISED DIRECTIVES (Next-Step Oriented):
        'GREETING': 'Goal: Ask "How are you?" to start the conversation.',
        'GET_NAME': 'Goal: Ask for the client\'s Full Name.',
        'LISTENING': 'Goal: The user gave their name. Thank them, and ask "How can we help you today?".',
        'QUALIFICATION': 'Goal: The user stated their need. Acknowledge it, then ask for the Loan Amount (in NIS).',
        'DATA_COLLECTION_CITY': 'Goal: Ask for the City/Town they live in.',
        'DATA_COLLECTION_PURPOSE': 'Goal: Ask for the specific Purpose of the loan (Renovation, Debt, Asset?).',
        'PROPERTY_OWNERSHIP': 'Goal: Ask if they own a real estate property (Yes/No).',
        'PROPERTY_DETAILS': 'Goal: User has property. Ask: Who owns it? Is it registered (Tabu)? Is there a permit?',
        'RISK_CHECK': 'Goal: Ask about BDI/Credit History in the last 3 years (Returned checks, seizures?).',
        'CLOSING': 'Goal: Thank the user. Say a senior consultant will analyze the data. Ask: "When is convenient for us to call you?".',
        'ANYTHING_ELSE': 'Goal: Ask if they have anything else to add before finishing.'
    };

    const currentDirective = stepDirectives[step] || 'Respond naturally and helpfuly.';

    const systemPrompt = `
System Role: Admatenu Betenu - Financial AI Agent No. 1
Location: 1 Haifa St., Daliyat al-Karmel.
Role: Expert agent for credit solutions, mortgages, and debt consolidation.
Tone: Warm, empathetic, professional, and DIRECT.

Iron Rules:
1. Language: You MUST respond in the SAME language as the User Input. 
   - If user speaks Hebrew, respond in HEBREW only.
   - If user speaks Arabic, respond in ARABIC only.
2. One Question Rule: ask ONLY ONE question at a time.
3. Flow: Follow the defined steps only.

Current Context:
Name: ${context.full_name || 'Unknown'}
Step: ${step}
Directive: ${currentDirective}
Language Context: ${language}

Task:
Draft the response to the user.
User Input: "${userInput}"

Constraints:
- Response MUST be in ${language === 'he' ? 'HEBREW' : (language === 'ar' ? 'ARABIC' : 'User Language')}.
- IF Step="GREETING": Output EXACTLY: "שלום, תודה שפנית לאדמתנו ביתנו. צוות המומחים שלנו כאן לשירותך. לפני הכל - מה שלומך היום?"
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
Return JSON: { "isValid": boolean, "reason": string, "suggestedResponse": string (optional) }

Context: Step "${step}".
Examples:
- GET_NAME + "David" -> true
- GET_NAME + "Pizza" -> false (Nonsense)
- GET_NAME + "Why?" -> false (Objection)
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
