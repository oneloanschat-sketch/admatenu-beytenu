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


const generateResponse = async (step, userInput, context = {}, language = 'he', history = []) => {
    if (!groq) return null;

    // ... (Directives map remains the same, omitted for brevity if I could, but I must replace the whole block or function start)
    // Actually I can just replace the function signature and the messages construction part.
    // But replace_file_content works on chunks.

    // Let's replace the signature and the messages creation.
    // I need to be careful with strict matching.

    // I will use a larger chunk to be safe.

    // ... [Previous directives code] ...
    const stepDirectives = {
        'GREETING': 'Welcome the user and ask "How are you?".',
        'GET_NAME': 'Acknowledge, then ask for full name.',
        'DATA_COLLECTION_CITY': 'Say "Nice to meet you [Name]", then ask which town/city they live in.',
        'QUALIFICATION': 'Ask for the requested loan amount (in NIS).',
        'DATA_COLLECTION_PURPOSE': 'Ask what the money is for.',
        'PROPERTY_OWNERSHIP': 'Ask if they own a property.',
        'PROPERTY_OWNERSHIP_WHO': 'Ask whose name the property is registered on (Self, Spouse, Both).',
        'PROPERTY_LOCATION': 'Ask where the property is registered (Tabu, Minhal, etc.).',
        'PROPERTY_PERMIT': 'Ask if there is a Building Permit.',
        'FAMILY_PROPERTY': 'Ask if there is a property owned by parents or first-degree family.',
        'FAMILY_PROPERTY_PERMIT': 'Ask if the family property has a Building Permit.',
        'RISK_CHECK': 'Ask about bank history (BDI) in the last 3 years.',
        'CLOSING': 'State that details have been passed to a representative, and ask "When is convenient to call?".'
    };

    const currentDirective = stepDirectives[step] || 'Respond naturally.';

    const systemPrompt = `
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

Flow Guidelines:
1. Greeting: Respectful, welcoming context.
2. Qualification: Name -> City -> Amount (Check >200k) -> Purpose.
3. Property Branch:
   - Owns Property? -> Who owns it? (Self/Spouse/Both) -> Location? -> Permit?
   - No Property? -> Family Property? -> Permit? -> If None, Reject respectfully ("to protect you").
4. Risk Check: Ask about BDI/Bank history.
5. Closing: Schedule a call with a senior consultant.

Current Context:
Name: ${context.full_name || 'Guest'}
City: ${context.city || 'Unknown'}
Amount: ${context.loan_amount || 'Unknown'}
Property: ${context.has_property || 'Unknown'}
Language: ${language}

Task:
Write the NEXT message based on Step: "${step}" and Directive: "${currentDirective}".
User Input: "${userInput}"

Constraints:
- IF rejecting: Do so respectfully, explaining it is to maintain financial responsibility.
- IF Step="GREETING": Use the fixed greeting: "שלום, תודה שפנית לאדמתנו ביתנו. אנחנו כאן כדי לספק את הפתרונות הטובים ביותר עבורך. לפני שנתקדם – מה שלומך היום?"
- NO JSON. Just the text.
    `;

    // Map history to Groq format
    const historyMessages = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const messages = [
        { role: "system", content: systemPrompt },
        ...historyMessages
    ];

    // Only add user input if it's not already the last message
    const lastMsg = historyMessages[historyMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userInput) {
        messages.push({ role: "user", content: userInput });
    }

    const text = await generateWithRetryLoop(messages, false); // Text Mode
    console.log(`[Groq] Step: ${step}, Input: "${userInput}" -> Output: "${text}"`);
    return text;
};

const validateInput = async (userInput, step, language = 'he') => {
    if (!groq) return { isValid: true };

    const systemPrompt = `
Task: Validate User Input.
Return JSON: { "isValid": boolean, "reason": string, "suggestedResponse": string (optional) }

Rules:
- General: Accept almost any relevant input.
- GET_NAME: Accept names (Hebrew or English). Reject gibberish or unrelated numbers.
- Fail only on complete gibberish.

Context: Step "${step}".
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

const processStep = async (step, userInput, context = {}, language = 'he', history = []) => {
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
    const nextResponse = await generateResponse(step, userInput, context, language, history);

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
