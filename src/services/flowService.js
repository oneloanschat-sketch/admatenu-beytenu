let supabase = require('../config/supabase');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');
const aiService = require('./aiService');
const { detectLanguage } = require('../utils/language');

// Dictionary for multilingual responses
const MESSAGES = {
    he: {
        greeting: "שלום (v2.0), ברוכים הבאים לאדמתנו ביתנו. מה שלומך?",
        get_name: "נעים מאוד! כדי שנוכל להתקדם, אשמח לדעת מה שמך המלא?",
        listening: "אני מבין, אנו עוזרים למשפחות במצבים דומים מדי יום. איך נוכל לעזור?",
        qualification_amount: "מהו סכום ההלוואה המבוקש? (בשקלים)",
        rejection: "אנו מתנצלים, אך סכום המינימום לטיפול הוא 200,000 ₪. נשמח לעמוד לשירותכם בעתיד.",
        city: "מהי עיר המגורים שלך?",
        purpose: "מהי מטרת ההלוואה? (לדוגמה: איחוד הלוואות, שיפוץ, משכנתא)",
        property_ownership: "האם יש בבעלותך (או בבעלות קרוב מדרגה ראשונה) נכס?",
        property_details: "על שם מי רשום הנכס? איפה הוא רשום (טאבו/מנהל)? והאם יש היתר בניה?",
        risk_check: "האם היו בעיות בנקאיות ב-3 השנים האחרונות? (צ'קים שחזרו, עיקולים, הגבלות בחשבון)",
        closing: "תודה רבה. הפרטים הועברו לנציג שיחזור אליך לשיחת ייעוץ חינם.",
        generic_objection: "אנו נשמח לעזור, אך עלינו להבין את הצרכים שלך קודם.",
        unknown: "לא הבנתי, אפשר לנסח שוב?"
    },
    ar: {
        greeting: "مرحبا، أهلاً بكم في 'أرضنا بيتنا'. كيف حالك؟",
        get_name: "تشرفنا! لكي نتمكن من التقدم، هل يمكنني معرفة اسمك الكامل؟",
        listening: "أنا أفهم، نحن نساعد العائلات في حالات مماثلة كل يوم. كيف يمكننا المساعدة؟",
        qualification_amount: "ما هو مبلغ القرض المطلوب؟ (بالشيكل)",
        rejection: "نعتذر، ولكن الحد الأدنى للتعامل هو 200,000 شيكل. نأمل أن نخدمكم في المستقبل.",
        city: "ما هي مدينة إقامتك؟",
        purpose: "ما هو الغرض من القرض؟ (مثلاً: توحيد القروض، ترميم، رهن عقاري)",
        property_ownership: "هل تملك (أو يملك قريب من الدرجة الأولى) عقاراً؟",
        property_details: "باسم من مسجل العقار؟ أين مسجل (طابو/منهال)؟ وهل يوجد رخصة بناء؟",
        risk_check: "هل كانت هناك مشاكل بنكية في السنوات الـ 3 الماضية؟ (شيكات راجعة، حجوزات، قيود على الحساب)",
        closing: "شكراً جزيلاً. تم تحويل التفاصيل إلى ممثل سيعاود الاتصال بك لاستشارة مجانية.",
        generic_objection: "يسعدنا المساعدة، ولكن نحتاج إلى فهم احتياجاتك أولاً.",
        unknown: "لم أفهم، هل يمكنك إعادة الصياغة؟"
    },
    ru: {
        greeting: "Здравствуйте, добро пожаловать в 'Адматену Бейтену'. Как вы?",
        get_name: "Очень приятно! Чтобы мы могли продолжить, как вас зовут (полное имя)?",
        listening: "Я понимаю, мы помогаем семьям в подобных ситуациях каждый день. Чем мы можем помочь?",
        qualification_amount: "Какова требуемая сумма кредита? (в шекелях)",
        rejection: "Приносим извинения, но минимальная сумма для обработки составляет 200 000 шекелей.",
        city: "В каком городе вы живете?",
        purpose: "Какова цель кредита? (например: консолидация долгов, ремонт, ипотека)",
        property_ownership: "Есть ли у вас (или у родственника первой степени) недвижимость?",
        property_details: "На чье имя зарегистрирована недвижимость? Где она зарегистрирована (Табу/Минхал)? Есть ли разрешение на строительство?",
        risk_check: "Были ли банковские проблемы за последние 3 года? (возвращенные чеки, аресты, ограничения счета)",
        closing: "Большое спасибо. Детали переданы представителю, который перезвонит вам для бесплатной консультации.",
        generic_objection: "Мы будем рады помочь, но сначала нам нужно понять ваши потребности.",
        unknown: "Я не понял, можете перефразировать?"
    }
};

const STEPS = {
    GREETING: 'GREETING',
    GET_NAME: 'GET_NAME',
    LISTENING: 'LISTENING',
    QUALIFICATION: 'QUALIFICATION',
    DATA_COLLECTION_CITY: 'DATA_COLLECTION_CITY',
    DATA_COLLECTION_PURPOSE: 'DATA_COLLECTION_PURPOSE',
    PROPERTY_OWNERSHIP: 'PROPERTY_OWNERSHIP',
    PROPERTY_DETAILS: 'PROPERTY_DETAILS',
    RISK_CHECK: 'RISK_CHECK',
    CLOSING: 'CLOSING'
};

// Hybrid Storage: In-Memory Backup
const localSessions = {};

const getSession = async (phoneNumber) => {
    // 1. Try DB
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('phone_number', phoneNumber)
                .single();

            if (!error && data) {
                // Sync local with DB
                localSessions[phoneNumber] = data;
                return data;
            }
        } catch (dbError) {
            console.error('DB Read Error (Falling back to local):', dbError.message);
        }
    }

    // 2. Fallback to Local
    const local = localSessions[phoneNumber];
    if (local) {
        console.log(`[Hybrid] Retrieved session for ${phoneNumber} from Memory.`);
        return local;
    }
    return null;
};

const createSession = async (phoneNumber) => {
    const newSession = {
        phone_number: phoneNumber,
        step: STEPS.GREETING,
        data: { language: 'he' },
        created_at: new Date()
    };

    // 1. Write Local (Always succeeds)
    localSessions[phoneNumber] = newSession;

    // 2. Try DB
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert([newSession])
                .select()
                .single();

            if (error) {
                console.error('DB Create Error (Using Local):', error.message);
            } else {
                return data;
            }
        } catch (dbError) {
            console.error('DB Create Exception:', dbError.message);
        }
    }
    return newSession;
};

const updateSession = async (phoneNumber, step, sessionData) => {
    // 1. Update Local
    if (localSessions[phoneNumber]) {
        localSessions[phoneNumber].step = step;
        localSessions[phoneNumber].data = sessionData;
        localSessions[phoneNumber].last_active = new Date();
    }

    // 2. Try DB
    if (supabase) {
        try {
            await supabase
                .from('sessions')
                .update({ step, data: sessionData, last_active: new Date() })
                .eq('phone_number', phoneNumber);
        } catch (dbError) {
            console.error('DB Update Error (Local updated only):', dbError.message);
        }
    }
};

const saveLead = async (session) => {
    if (!supabase) {
        console.warn('[Hybrid] DB not connected. Lead saving skipped (Data in memory):', session.data);
        return;
    }

    try {
        const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('phone_number', session.phone_number)
            .single();

        if (existingLead) {
            console.warn(`Double Lead detected for ${session.phone_number}`);
            return;
        }

        const leadData = {
            phone_number: session.phone_number,
            full_name: session.data.full_name || 'N/A',
            language: session.data.language || 'he',
            loan_amount: session.data.loan_amount,
            city: session.data.city,
            purpose: session.data.purpose,
            has_property: session.data.has_property,
            property_details: session.data.property_details,
            risk_info: session.data.risk_info,
            status: 'new',
            created_at: new Date()
        };

        await supabase.from('leads').insert([leadData]);
        console.log(`Lead saved to DB: ${session.phone_number}`);

        // WhatsApp Admin Notification
        const adminPhone = process.env.ADMIN_PHONE;
        if (adminPhone) {
            const summary = `
*New Lead Created!* 🚀
Name: ${leadData.full_name}
Phone: ${leadData.phone_number}
Amount: ${leadData.loan_amount}
City: ${leadData.city}
Purpose: ${leadData.purpose}
Property: ${leadData.has_property}
Details: ${leadData.property_details}
Risk: ${leadData.risk_info}
Language: ${leadData.language}
            `.trim();

            await whatsappService.sendMessage(adminPhone, summary);
        }
    } catch (e) {
        console.error('Failed to save lead to DB:', e.message);
    }
};


const sendResponse = async (phoneNumber, step, session, fallbackKey, userInput) => {
    const lang = session.data.language || 'he';
    const context = session.data;

    // Generate AI response
    const aiText = await aiService.generateResponse(step, userInput, context, lang);

    if (aiText) {
        await whatsappService.sendMessage(phoneNumber, aiText);
    } else {
        // Fallback to static message
        await whatsappService.sendMessage(phoneNumber, MESSAGES[lang][fallbackKey]);
    }
};

const RESET_KEYWORDS = ['hi', 'hello', 'שלום', 'היי', 'אהלן', 'start', 'reset', 'restart'];

const processMessage = async (phoneNumber, messageBody) => {
    const lowerBody = messageBody.toLowerCase().trim();
    let session = await getSession(phoneNumber);

    // Check for explicit reset/greeting to restart flow
    if (RESET_KEYWORDS.some(kw => lowerBody === kw || lowerBody.startsWith(kw + ' '))) {
        console.log(`Resetting session for ${phoneNumber} due to greeting/reset keyword.`);
        // If session exists, reset it. If not, create later.
        if (session) {
            const lang = detectLanguage(messageBody);
            session.data = { language: lang }; // Clear other data
            await updateSession(phoneNumber, STEPS.GREETING, session.data);
            // We want to fall through to "if (!session)" logic? No, session exists now.
            // We want to send greeting.
            await sendResponse(phoneNumber, 'GREETING', session, 'greeting', messageBody);
            return;
        }
        // If no session, it will be created below naturally.
    }

    if (!session) {
        console.log(`Creating new session for ${phoneNumber}...`);
        session = await createSession(phoneNumber);

        if (!session) {
            console.error(`CRITICAL: Failed to create session for ${phoneNumber}. Database connectivity issue?`);
            await whatsappService.sendMessage(phoneNumber, "Service temporarily unavailable. Please try again later.");
            return;
        }

        const lang = detectLanguage(messageBody);
        if (session.data) {
            session.data.language = lang;
        } else {
            console.error('Session created but data is null');
            return;
        }

        console.log(`Sending greeting to ${phoneNumber} in ${lang}`);
        await sendResponse(phoneNumber, 'GREETING', session, 'greeting', messageBody);
        await updateSession(phoneNumber, STEPS.GREETING, session.data);
        return;
    }

    console.log(`Existing session for ${phoneNumber}: step=${session.step}`);
    const lang = session.data.language || 'he';
    const step = session.step;

    switch (step) {
        case STEPS.GREETING:
            // User responded to "How are you?"
            await sendResponse(phoneNumber, 'GET_NAME', session, 'get_name', messageBody);
            await updateSession(phoneNumber, STEPS.GET_NAME, session.data);
            break;

        case STEPS.GET_NAME:
            const valName = await aiService.validateInput(messageBody, 'GET_NAME', lang);
            if (!valName.isValid) {
                await whatsappService.sendMessage(phoneNumber, valName.suggestedResponse || MESSAGES[lang].unknown);
                return; // Stay in GET_NAME
            }
            session.data.full_name = messageBody;
            await sendResponse(phoneNumber, 'LISTENING', session, 'listening', messageBody);
            await updateSession(phoneNumber, STEPS.LISTENING, session.data);
            break;

        case STEPS.LISTENING:
            // Listening usually doesn't need validation as it's a transition, but let's be safe if they say nonsense
            const valListen = await aiService.validateInput(messageBody, 'LISTENING', lang);
            if (!valListen.isValid) {
                await whatsappService.sendMessage(phoneNumber, valListen.suggestedResponse || MESSAGES[lang].unknown);
                return;
            }
            await sendResponse(phoneNumber, 'INFO_AMOUNT', session, 'qualification_amount', messageBody);
            await updateSession(phoneNumber, STEPS.QUALIFICATION, session.data);
            break;

        case STEPS.QUALIFICATION:
            const aiAmountResponse = await aiService.analyzeInput(messageBody, 'QUALIFICATION', lang);
            let amount = null;

            if (aiAmountResponse && aiAmountResponse.amount) {
                amount = aiAmountResponse.amount;
            } else {
                amount = parseInt(messageBody.replace(/\D/g, ''));
            }

            if (!amount || amount < 200000) {
                // Check if it was an objection or nonsense before rejecting?
                // Actually amount validation is tricky. If they say "Banana", amount is null.
                // We should probably validate first.
                const valAmount = await aiService.validateInput(messageBody, 'QUALIFICATION', lang);
                if (!valAmount.isValid) {
                    await whatsappService.sendMessage(phoneNumber, valAmount.suggestedResponse || MESSAGES[lang].unknown);
                    return;
                }

                // If valid but under 200k, reject.
                await sendResponse(phoneNumber, 'REJECTION', session, 'rejection', messageBody);
                await updateSession(phoneNumber, 'CLOSED', session.data);
                return;
            }
            session.data.loan_amount = amount;
            await sendResponse(phoneNumber, 'INFO_CITY', session, 'city', messageBody);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_CITY, session.data);
            break;

        case STEPS.DATA_COLLECTION_CITY:
            const valCity = await aiService.validateInput(messageBody, 'DATA_COLLECTION_CITY', lang);
            if (!valCity.isValid) {
                await whatsappService.sendMessage(phoneNumber, valCity.suggestedResponse || MESSAGES[lang].city); // Fallback to re-asking
                return;
            }
            session.data.city = messageBody;
            await sendResponse(phoneNumber, 'INFO_PURPOSE', session, 'purpose', messageBody);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_PURPOSE, session.data);
            break;

        case STEPS.DATA_COLLECTION_PURPOSE:
            const valPurpose = await aiService.validateInput(messageBody, 'DATA_COLLECTION_PURPOSE', lang);
            if (!valPurpose.isValid) {
                await whatsappService.sendMessage(phoneNumber, valPurpose.suggestedResponse || MESSAGES[lang].purpose);
                return;
            }
            session.data.purpose = messageBody;
            await sendResponse(phoneNumber, 'INFO_PROPERTY', session, 'property_ownership', messageBody);
            await updateSession(phoneNumber, STEPS.PROPERTY_OWNERSHIP, session.data);
            break;

        case STEPS.PROPERTY_OWNERSHIP:
            const valProp = await aiService.validateInput(messageBody, 'PROPERTY_OWNERSHIP', lang);
            if (!valProp.isValid) {
                await whatsappService.sendMessage(phoneNumber, valProp.suggestedResponse || MESSAGES[lang].property_ownership);
                return;
            }

            const aiPropertyResponse = await aiService.analyzeInput(messageBody, 'PROPERTY_OWNERSHIP', lang);
            let hasProperty = false;

            if (aiPropertyResponse && aiPropertyResponse.has_property !== null) {
                hasProperty = aiPropertyResponse.has_property;
            } else {
                hasProperty = messageBody.toLowerCase().includes('yes') || messageBody.toLowerCase().includes('ken') || messageBody.toLowerCase().includes('naam') || messageBody.includes('כן');
            }

            session.data.has_property = hasProperty ? 'yes' : 'no';

            // Ask for property details regardless for now, or customize based on Yes/No
            await sendResponse(phoneNumber, 'INFO_PROPERTY', session, 'property_details', messageBody);
            // Note: Reuse INFO_PROPERTY or make new step INFO_DETAILS? 
            // The prompt has INFO_PROPERTY. Let's stick to it or add INFO_DETAILS to prompt if needed. 
            // 'INFO_PROPERTY' in prompt covers "Ask details".
            await updateSession(phoneNumber, STEPS.PROPERTY_DETAILS, session.data);
            break;

        case STEPS.PROPERTY_DETAILS:
            const valDetails = await aiService.validateInput(messageBody, 'PROPERTY_DETAILS', lang);
            if (!valDetails.isValid) {
                await whatsappService.sendMessage(phoneNumber, valDetails.suggestedResponse || MESSAGES[lang].property_details);
                return;
            }
            session.data.property_details = messageBody;
            await sendResponse(phoneNumber, 'RISK_CHECK', session, 'risk_check', messageBody);
            await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
            break;

        case STEPS.RISK_CHECK:
            const valRisk = await aiService.validateInput(messageBody, 'RISK_CHECK', lang);
            if (!valRisk.isValid) {
                await whatsappService.sendMessage(phoneNumber, valRisk.suggestedResponse || MESSAGES[lang].risk_check);
                return;
            }
            session.data.risk_info = messageBody;
            await saveLead(session);
            await sendResponse(phoneNumber, 'CLOSING', session, 'closing', messageBody);
            await updateSession(phoneNumber, 'COMPLETED', session.data);
            break;

        default:
            break;
    }
};

const injectDb = (mockDb) => {
    supabase = mockDb;
};

module.exports = {
    processMessage,
    injectDb
};
