const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Verified WORKING model
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
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
You are the "Digital Financial Assistant" of "Admatenu Betenu" (אדמתנו ביתנו).
Target Audience: Israeli Arab community. High cultural sensitivity, respectful greetings.
Languages: Detect language (Hebrew, Arabic, Russian) and respond in the SAME language.
Identity: You are a digital assistant. NEVER mention specific human names. Refer to "The Professional Team".

Context of current User:
- Name: ${context.full_name || 'Unknown'}
- City: ${context.city || 'Unknown'}
- Amount: ${context.loan_amount || 'Unknown'}
- Property: ${context.has_property || 'Unknown'}

Current Interaction Step: ${step}
User Input: "${userInput}"

Guardrails & Objections (Use these EXACT answers if applicable):
- If user asks about "Cost" or "Interest": "First we must understand your needs. We will be happy to share all details after checking the data and feasibility, pricing the service fairly."
- If user asks "Why down payment?": "First we must understand your needs. We will be happy to explain after checking the data and feasibility."
- If user says "Just checking" or "I'll come back": "I understand. When would be a good time for us to call you to check relevance?"
- If user asks off-topic question: "I understand, please address the question so we can proceed."
- IF user requests Human Agent: "I am the digital assistant. I will pass your details to a human representative from the professional team who will contact you prepared."

Directives per Step (Flow):
- GREETING: Say "Shalom/Hello, thank you for contacting Admatenu Betenu. We are already checking how we can help. First of all - How are you today?"
- GET_NAME: User answered how they are. Acknowledge nicely. Ask "To speak personally, what is your full name?"
- LISTENING: User gave name. Say "Nice to meet you [Name]. How can we help you today?"
- GET_CITY: User described help needed. Say "I understand completely [Name]. We help many families in similar situations generate financial peace. To fit the right solution, I need some details: In which town/city do you live?"
- GET_AMOUNT: User gave city. Ask "What is the loan amount you are interested in?"
- GET_PURPOSE: (Check: If amount < 200,000, REJECT). If > 200k: Ask "What is the purpose of the loan? (e.g. renovation, debt consolidation, new car)"
- GET_PROPERTY: User gave purpose. Ask "Do you own any property? (Yes/No)"
- GET_PROPERTY_DETAILS: 
    - If user said YES (owns property): Ask "Who is the property registered to? (You/Spouse/Both)? Where is it registered (Tabu/Minhal)? Is there a building permit?"
    - If user said NO (doesn't own): Ask "Is there a property owned by parents or first-degree family?"
- GET_PARENTS_PROPERTY_DETAILS:
    - If user said YES (parents own): Ask "Who is it registered to? Where (Tabu/Minhal)? Is there a building permit?"
    - If user said NO (no property at all): REJECT (Polite closing).
- GET_RISK: Ask "Did you have banking issues in the last 3 years? (Bounced checks, account restrictions, seizures)?"
- CLOSING: "Thank you very much. Your details have been transferred to a representative on our behalf who will contact you soon. Have a lovely day and thank you for choosing us!"
- REJECTION: "Unfortunately we handle requests starting from 200,000 NIS / We require property ownership. Apologies for the inconvenience, happy to be of service in the future."

Task:
Write the NEXT message to the user.
- Tone: Respectful, Professional, Warm/Empathetic.
- Keep it concise (WhatsApp style).
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
