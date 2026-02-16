let supabase = require('../config/supabase');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');
const aiService = require('./aiService');
const { detectLanguage } = require('../utils/language');

// Dictionary for multilingual responses
// Dictionary for multilingual responses
const MESSAGES = {
    he: {
        greeting: "שלום, תודה שפנית ל'אדמתנו ביתנו'. אנחנו כאן כדי לספק את הפתרונות הטובים ביותר עבורך. לפני שנתקדם – מה שלומך היום?",
        get_name: "שמח לשמוע. כדי שנוכל לדבר בצורה אישית, איך קוראים לך?",
        city: "נעים להכיר [Name]. באיזה יישוב אתה גר?",
        qualification_amount: "איזה סכום אתה מעוניין לקבל?",
        rejection_amount: "לצערנו אנו מטפלים בבקשות החל מ-200,000 ש\"ח. סליחה על אי הנוחות, ונשמח לעמוד לרשותך בעתיד.",
        purpose: "לאיזו מטרה מיועדת ההלוואה? (לדוגמה: שיפוץ, סגירת חובות, רכב חדש וכו')",
        property_ownership: "האם בבעלותך נכס כלשהו? (כן / לא)",
        property_ownership_who: "על שם מי רשום הנכס? (על שמך / בן זוג / שניכם)",
        property_location: "היכן רשום הנכס? (טאבו / מינהל / לא רשום / לא בטוח)",
        property_permit: "האם קיים לנכס היתר בנייה? (כן / לא / לא בטוח)",
        family_property: "האם קיים נכס בבעלות הורים או משפחה מדרגה ראשונה?",
        rejection_no_property: "תודה, התהליך מתאים למקרים בהם קיים נכס בבעלות הלקוח או משפחתו. נשמח לעמוד לרשותך בעתיד.",
        risk_check: "האם היו לך בעיות מול הבנקים ב-3 השנים האחרונות? (כגון חזרות צ'קים, הגבלות חשבון או עיקולים?)",
        closing: "הפרטים שלך הועברו לנציג מטעמנו. מתי נוח לך שהוא יחזור אליך?",
        unknown: "לא הבנתי, אפשר לנסח שוב?"
    },
    ar: {
        greeting: "مرحبا، شكرا لتواصلك مع 'أرضنا بيتنا'. كيف حالك اليوم؟",
        get_name: "يسعدني سماع ذلك. لنتحدث بشكل شخصي، ما هو اسمك؟",
        city: "تشرفنا [Name]. في أي بلدة تسكن؟",
        qualification_amount: "ما هو المبلغ الذي ترغب في الحصول عليه؟",
        rejection_amount: "نعتذر، نتعامل مع طلبات تبدأ من 200,000 شيكل.",
        purpose: "ما هو الغرض من القرض؟",
        property_ownership: "هل تملك عقاراً؟ (نعم / لا)",
        property_ownership_who: "باسم من مسجل العقار؟",
        property_location: "أين مسجل العقار؟ (طابو / دائرة أراضي / غير مسجل)",
        property_permit: "هل يوجد رخصة بناء؟",
        family_property: "هل يوجد عقار بملكية الوالدين أو أقارب درجة أولى؟",
        rejection_no_property: "شكرا، العملية تناسب من يملكون عقاراً.",
        risk_check: "هل كانت هناك مشاكل بنكية في آخر 3 سنوات؟",
        closing: "تم تحويل التفاصيل لمندوبنا. متى يناسبك الاتصال؟",
        unknown: "لم أفهم، هل يمكنك الإعادة؟"
    },
    ru: {
        greeting: "Здравствуйте, спасибо за обращение. Как вы сегодня?",
        get_name: "Рад слышать. Как вас зовут?",
        city: "Приятно познакомиться [Name]. В каком городе вы живете?",
        qualification_amount: "Какую сумму вы хотите получить?",
        rejection_amount: "Извините, мы работаем с суммами от 200,000 шекелей.",
        purpose: "Какова цель кредита?",
        property_ownership: "Есть ли у вас недвижимость? (Да / Нет)",
        property_ownership_who: "На чье имя записана недвижимость?",
        property_location: "Где зарегистрирована недвижимость?",
        property_permit: "Есть ли разрешение на строительство?",
        family_property: "Есть ли недвижимость у родителей или близких родственников?",
        rejection_no_property: "Спасибо, процесс подходит для владельцев недвижимости.",
        risk_check: "Были ли банковские проблемы за последние 3 года?",
        closing: "Детали переданы представителю. Когда вам удобно принять звонок?",
        unknown: "Я не понял, повторите пожалуйста."
    }
};

const STEPS = {
    GREETING: 'GREETING',
    GET_NAME: 'GET_NAME',
    DATA_COLLECTION_CITY: 'DATA_COLLECTION_CITY',
    QUALIFICATION: 'QUALIFICATION',
    DATA_COLLECTION_PURPOSE: 'DATA_COLLECTION_PURPOSE',
    PROPERTY_OWNERSHIP: 'PROPERTY_OWNERSHIP',
    PROPERTY_OWNERSHIP_WHO: 'PROPERTY_OWNERSHIP_WHO',
    PROPERTY_LOCATION: 'PROPERTY_LOCATION',
    PROPERTY_PERMIT: 'PROPERTY_PERMIT',
    FAMILY_PROPERTY: 'FAMILY_PROPERTY',
    FAMILY_PROPERTY_PERMIT: 'FAMILY_PROPERTY_PERMIT',
    RISK_CHECK: 'RISK_CHECK',
    CLOSING: 'CLOSING'
};

// Hybrid Storage: In-Memory Backup
const localSessions = {};

const getSession = async (phoneNumber) => {
    // 1. Prefer Local Memory (Single Source of Truth for active conversation)
    if (localSessions[phoneNumber]) {
        // Optional: Check if local is expired? For now, assume it's fresh.
        // console.log(`[Hybrid] Used Memory for ${phoneNumber}`);
        return localSessions[phoneNumber];
    }

    // 2. Try DB (Only if not in memory - e.g. restart)
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('phone_number', phoneNumber)
                .single();

            if (!error && data) {
                // Determine if DB is actually newer? 
                // For simplicity, if we have NO local, we accept DB.
                localSessions[phoneNumber] = data;
                console.log(`[Hybrid] Loaded session for ${phoneNumber} from DB.`);
                return data;
            }
        } catch (dbError) {
            console.error('DB Read Error (Falling back to local):', dbError.message);
        }
    }

    return null;
};

const createSession = async (phoneNumber) => {
    const newSession = {
        phone_number: phoneNumber,
        step: STEPS.GREETING,
        data: { language: 'he', history: [] },
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
            const { error, count } = await supabase
                .from('sessions')
                .update({ step, data: sessionData, last_active: new Date() })
                .eq('phone_number', phoneNumber)
                .select('id', { count: 'exact' });

            if (error) {
                console.error('DB Update Error:', error.message);
            } else {
                console.log(`[DB] Updated session for ${phoneNumber}: Step=${step}, Count=${count}`);
            }
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



const addToHistory = (session, role, content) => {
    if (!session.data.history) session.data.history = [];
    session.data.history.push({ role, content });

    // Keep last 30 messages
    if (session.data.history.length > 30) {
        session.data.history = session.data.history.slice(-30);
    }
};

const sendResponse = async (phoneNumber, step, session, fallbackKey, userInput) => {
    const lang = session.data.language || 'he';
    const context = session.data;
    const history = session.data.history || [];

    // Generate AI response (Will retry forever until success)
    const aiText = await aiService.generateResponse(step, userInput, context, lang, history);

    if (aiText) {
        await whatsappService.sendMessage(phoneNumber, aiText);
        addToHistory(session, 'assistant', aiText); // Save to history
    }
    // No else: If aiText is null (impossible with retry loop unless crashed), we send nothing.
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

    // Add User Message to History
    addToHistory(session, 'user', messageBody);

    const lang = session.data.language || 'he';
    const step = session.step;

    switch (step) {
        case STEPS.GREETING:
            // User responded to "How are you?"
            // We move to GET_NAME immediately, but we generate the response FOR GET_NAME
            // while passing the user's "How are you" answer as scope.

            await updateSession(phoneNumber, STEPS.GET_NAME, session.data);
            await sendResponse(phoneNumber, 'GET_NAME', session, 'get_name', messageBody);
            break;

        case STEPS.GET_NAME:
            const procName = await aiService.processStep('GET_NAME', messageBody, session.data, lang, session.data.history);
            if (!procName.isValid) {
                await whatsappService.sendMessage(phoneNumber, procName.response || MESSAGES[lang].unknown);
                addToHistory(session, 'assistant', procName.response || MESSAGES[lang].unknown);
                return;
            }
            session.data.full_name = messageBody;

            // SKIP LISTENING -> DIRECT TO QUALIFICATION
            await updateSession(phoneNumber, STEPS.QUALIFICATION, session.data);
            await sendResponse(phoneNumber, 'QUALIFICATION', session, 'qualification_amount', messageBody);
            break;

        case STEPS.QUALIFICATION:
            const procQual = await aiService.processStep('QUALIFICATION', messageBody, session.data, lang, session.data.history);

            if (!procQual.isValid) {
                await whatsappService.sendMessage(phoneNumber, procQual.response);
                addToHistory(session, 'assistant', procQual.response);
                return;
            }

            let amount = procQual.data ? procQual.data.amount : null;
            if (!amount) amount = parseInt(messageBody.replace(/\D/g, ''));

            if (!amount || amount < 200000) {
                // Rejection
                await sendResponse(phoneNumber, 'REJECTION', session, 'rejection', messageBody);
                await updateSession(phoneNumber, 'CLOSED', session.data);
                return;
            }

            session.data.loan_amount = amount;
            // Valid Amount. Move to CITY.
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_CITY, session.data);
            await sendResponse(phoneNumber, 'DATA_COLLECTION_CITY', session, 'city', messageBody);
            break;

        case STEPS.DATA_COLLECTION_CITY:
            const procCity = await aiService.processStep('DATA_COLLECTION_CITY', messageBody, session.data, lang, session.data.history);
            if (!procCity.isValid) {
                await whatsappService.sendMessage(phoneNumber, procCity.response);
                addToHistory(session, 'assistant', procCity.response);
                return;
            }
            session.data.city = messageBody;

            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_PURPOSE, session.data);
            await sendResponse(phoneNumber, 'DATA_COLLECTION_PURPOSE', session, 'purpose', messageBody);
            break;

        case STEPS.DATA_COLLECTION_PURPOSE:
            const procPurpose = await aiService.processStep('DATA_COLLECTION_PURPOSE', messageBody, session.data, lang, session.data.history);
            if (!procPurpose.isValid) {
                await whatsappService.sendMessage(phoneNumber, procPurpose.response);
                addToHistory(session, 'assistant', procPurpose.response);
                return;
            }
            session.data.purpose = messageBody;

            await updateSession(phoneNumber, STEPS.PROPERTY_OWNERSHIP, session.data);
            await sendResponse(phoneNumber, 'PROPERTY_OWNERSHIP', session, 'property_ownership', messageBody);
            break;

        case STEPS.PROPERTY_OWNERSHIP:
            const procProp = await aiService.processStep('PROPERTY_OWNERSHIP', messageBody, session.data, lang, session.data.history);
            if (!procProp.isValid) {
                await whatsappService.sendMessage(phoneNumber, procProp.response);
                addToHistory(session, 'assistant', procProp.response);
                return;
            }

            let hasProperty = false;
            if (procProp.data && procProp.data.has_property !== null) {
                hasProperty = procProp.data.has_property;
            } else {
                hasProperty = messageBody.toLowerCase().includes('yes') || messageBody.includes('כן');
            }
            session.data.has_property = hasProperty ? 'yes' : 'no';

            if (hasProperty) {
                await updateSession(phoneNumber, STEPS.PROPERTY_DETAILS, session.data);
                await sendResponse(phoneNumber, 'PROPERTY_DETAILS', session, 'property_details', messageBody);
            } else {
                await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
                await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].risk_check);
                addToHistory(session, 'assistant', MESSAGES[lang].risk_check);
            }
            break;

        case STEPS.PROPERTY_DETAILS:
            const procDetails = await aiService.processStep('PROPERTY_DETAILS', messageBody, session.data, lang, session.data.history);
            if (!procDetails.isValid) {
                await whatsappService.sendMessage(phoneNumber, procDetails.response);
                addToHistory(session, 'assistant', procDetails.response);
                return;
            }
            session.data.property_details = messageBody;

            await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
            await sendResponse(phoneNumber, 'RISK_CHECK', session, 'risk_check', messageBody);
            break;

        case STEPS.RISK_CHECK:
            const procRisk = await aiService.processStep('RISK_CHECK', messageBody, session.data, lang, session.data.history);
            if (!procRisk.isValid) {
                await whatsappService.sendMessage(phoneNumber, procRisk.response);
                addToHistory(session, 'assistant', procRisk.response);
                return;
            }
            session.data.risk_info = messageBody;

            await updateSession(phoneNumber, STEPS.ANYTHING_ELSE, session.data);
            await sendResponse(phoneNumber, 'ANYTHING_ELSE', session, 'anything_else', messageBody);
            break;

        case STEPS.ANYTHING_ELSE:
            // This step handles the answer to "Risks?" -> It asks "Anything else?"
            // Wait, previous step sent "Anything else?" prompt.
            // So here messageBody is "No thanks" or "Yes I have debts".

            const procAny = await aiService.processStep('ANYTHING_ELSE', messageBody, session.data, lang, session.data.history);
            if (!procAny.isValid) {
                await whatsappService.sendMessage(phoneNumber, procAny.response);
                addToHistory(session, 'assistant', procAny.response);
                return;
            }

            if (procAny.data && procAny.data.notes) {
                session.data.risk_info += `\n[Notes]: ${procAny.data.notes}`;
            }

            // Ask "When to call?"
            await updateSession(phoneNumber, STEPS.CLOSING, session.data);
            await sendResponse(phoneNumber, 'CLOSING', session, 'closing', messageBody);
            break;

        case STEPS.CLOSING:
            // Input: "Tomorrow at 5"
            const procClosing = await aiService.processStep('CLOSING', messageBody, session.data, lang, session.data.history);
            // We don't really validate urgency/time strictly, just accept it.

            session.data.preferred_call_time = messageBody;
            await saveLead(session);

            // Final message: "Details passed. Lovely day."
            await whatsappService.sendMessage(phoneNumber, procClosing.response);
            addToHistory(session, 'assistant', procClosing.response);

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
