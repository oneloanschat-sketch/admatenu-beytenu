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
        property_details: "האם יש היתר בניה לנכס?",
        risk_check: "האם היו בעיות בנקאיות ב-3 השנים האחרונות? (צ'קים שחזרו, עיקולים, הגבלות בחשבון)",
        anything_else: "האם יש משהו נוסף שתרצה להוסיף?",
        closing: "תודה רבה! הפרטים הועברו ליועץ בכיר מטעמנו, מתי נוח לך שהוא יתקשר אליך?",
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
        property_details: "هل يوجد رخصة بناء للعقار؟",
        risk_check: "هل كانت هناك مشاكل بنكية في السنوات الـ 3 الماضية؟ (شيكات راجعة، حجوزات، قيود على الحساب)",
        anything_else: "هل هناك أي شيء آخر تود إضافته؟",
        closing: "شكراً جزيلاً! تم تحويل التفاصيل إلى مستشار كبير، متى يناسبك الاتصال بك؟",
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
        property_details: "Есть ли разрешение на строительство?",
        risk_check: "Были ли банковские проблемы за последние 3 года? (возвращенные чеки, аресты, ограничения счета)",
        anything_else: "Хотите ли вы добавить что-нибудь еще?",
        closing: "Большое спасибо! Детали переданы старшему консультанту, когда вам удобно принять звонок?",
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
    ANYTHING_ELSE: 'ANYTHING_ELSE',
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

    // Keep last 10 messages
    if (session.data.history.length > 10) {
        session.data.history = session.data.history.slice(-10);
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
            await sendResponse(phoneNumber, 'GET_NAME', session, 'get_name', messageBody);
            await updateSession(phoneNumber, STEPS.GET_NAME, session.data);
            break;

        case STEPS.GET_NAME:
            const procName = await aiService.processStep('GET_NAME', messageBody, session.data, lang, session.data.history);
            if (!procName.isValid) {
                await whatsappService.sendMessage(phoneNumber, procName.response || MESSAGES[lang].unknown);
                addToHistory(session, 'assistant', procName.response || MESSAGES[lang].unknown);
                return;
            }
            session.data.full_name = messageBody; // Or procName.data.value if extracted nicely
            await whatsappService.sendMessage(phoneNumber, procName.response); // Send the "Listening" response generated by AI
            addToHistory(session, 'assistant', procName.response);
            await updateSession(phoneNumber, STEPS.LISTENING, session.data);
            break;

        case STEPS.LISTENING:
            // Listening is just a bridge step, we move to QUALIFICATION
            // AI "Next Goal" for LISTENING was "Ask Amount".
            const procList = await aiService.processStep('LISTENING', messageBody, session.data, lang, session.data.history);
            // Even if invalid (nonsense), we mostly move on, or AI handles it.
            // But let's trust AI.
            if (!procList.isValid) {
                await whatsappService.sendMessage(phoneNumber, procList.response);
                addToHistory(session, 'assistant', procList.response);
                return;
            }
            await whatsappService.sendMessage(phoneNumber, procList.response);
            addToHistory(session, 'assistant', procList.response);
            await updateSession(phoneNumber, STEPS.QUALIFICATION, session.data);
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
            await whatsappService.sendMessage(phoneNumber, procQual.response); // Helper asks for City
            addToHistory(session, 'assistant', procQual.response);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_CITY, session.data);
            break;

        case STEPS.DATA_COLLECTION_CITY:
            const procCity = await aiService.processStep('DATA_COLLECTION_CITY', messageBody, session.data, lang, session.data.history);
            if (!procCity.isValid) {
                await whatsappService.sendMessage(phoneNumber, procCity.response);
                addToHistory(session, 'assistant', procCity.response);
                return;
            }
            session.data.city = messageBody;
            await whatsappService.sendMessage(phoneNumber, procCity.response); // Asks Purpose
            addToHistory(session, 'assistant', procCity.response);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_PURPOSE, session.data);
            break;

        case STEPS.DATA_COLLECTION_PURPOSE:
            const procPurpose = await aiService.processStep('DATA_COLLECTION_PURPOSE', messageBody, session.data, lang, session.data.history);
            if (!procPurpose.isValid) {
                await whatsappService.sendMessage(phoneNumber, procPurpose.response);
                addToHistory(session, 'assistant', procPurpose.response);
                return;
            }
            session.data.purpose = messageBody;
            await whatsappService.sendMessage(phoneNumber, procPurpose.response); // Asks Property Ownership
            addToHistory(session, 'assistant', procPurpose.response);
            await updateSession(phoneNumber, STEPS.PROPERTY_OWNERSHIP, session.data);
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
                await whatsappService.sendMessage(phoneNumber, procProp.response); // Asks permission
                addToHistory(session, 'assistant', procProp.response);
                await updateSession(phoneNumber, STEPS.PROPERTY_DETAILS, session.data);
            } else {
                await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].risk_check);
                addToHistory(session, 'assistant', MESSAGES[lang].risk_check);
                await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
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
            await whatsappService.sendMessage(phoneNumber, procDetails.response); // Asks Risk
            addToHistory(session, 'assistant', procDetails.response);
            await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
            break;

        case STEPS.RISK_CHECK:
            const procRisk = await aiService.processStep('RISK_CHECK', messageBody, session.data, lang, session.data.history);
            if (!procRisk.isValid) {
                await whatsappService.sendMessage(phoneNumber, procRisk.response);
                addToHistory(session, 'assistant', procRisk.response);
                return;
            }
            session.data.risk_info = messageBody;
            await whatsappService.sendMessage(phoneNumber, procRisk.response); // Asks "Anything Else?"
            addToHistory(session, 'assistant', procRisk.response);
            await updateSession(phoneNumber, STEPS.ANYTHING_ELSE, session.data);
            break;

        case STEPS.ANYTHING_ELSE:
            const procAny = await aiService.processStep('ANYTHING_ELSE', messageBody, session.data, lang, session.data.history);
            if (!procAny.isValid) {
                await whatsappService.sendMessage(phoneNumber, procAny.response);
                addToHistory(session, 'assistant', procAny.response);
                return;
            }
            if (procAny.data && procAny.data.notes) {
                session.data.risk_info += `\n[Notes]: ${procAny.data.notes}`;
            }

            await saveLead(session); // Save NOW
            await whatsappService.sendMessage(phoneNumber, procAny.response); // Closing message
            addToHistory(session, 'assistant', procAny.response);
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
