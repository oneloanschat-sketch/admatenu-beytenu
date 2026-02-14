let supabase = require('../config/supabase');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');
const { detectLanguage } = require('../utils/language');

// Dictionary for multilingual responses
const MESSAGES = {
    he: {
        greeting: "שלום, ברוכים הבאים לאדמתנו ביתנו. מה שלומך?",
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
        greeting: "מرحبا، أهلاً بكم في 'أرضنا بيتنا'. كيف حالك؟",
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
    LISTENING: 'LISTENING',
    QUALIFICATION: 'QUALIFICATION',
    DATA_COLLECTION_CITY: 'DATA_COLLECTION_CITY',
    DATA_COLLECTION_PURPOSE: 'DATA_COLLECTION_PURPOSE',
    PROPERTY_OWNERSHIP: 'PROPERTY_OWNERSHIP',
    PROPERTY_DETAILS: 'PROPERTY_DETAILS',
    RISK_CHECK: 'RISK_CHECK',
    CLOSING: 'CLOSING'
};

const getSession = async (phoneNumber) => {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

    if (error || !data) {
        return null;
    }
    return data;
};

const createSession = async (phoneNumber) => {
    const { data, error } = await supabase
        .from('sessions')
        .insert([{ phone_number: phoneNumber, step: STEPS.GREETING, data: { language: 'he' } }])
        .select()
        .single();

    if (error) console.error('Error creating session:', error);
    return data;
};

const updateSession = async (phoneNumber, step, sessionData) => {
    await supabase
        .from('sessions')
        .update({ step, data: sessionData, last_active: new Date() })
        .eq('phone_number', phoneNumber);
};

const saveLead = async (session) => {
    const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('phone_number', session.phone_number)
        .single();

    if (existingLead) {
        console.warn(`Double Lead detected for ${session.phone_number}`);
        // Notify team about double lead
        await emailService.sendEmail(
            process.env.EMAIL_TO,
            `DOUBLE LEAD ALERT: ${session.phone_number}`,
            `Number already exists in system.`
        );
        return;
    }

    const leadData = {
        phone_number: session.phone_number,
        full_name: session.data.full_name || 'N/A', // We don't explicitly ask name in flow, maybe extract from profile if possible, prompt says "identify user's full name" in greeting phase but usually WA API gives it. For now placeholder.
        language: session.data.language,
        loan_amount: session.data.loan_amount,
        city: session.data.city,
        purpose: session.data.purpose,
        has_property: session.data.has_property === 'yes',
        property_details: session.data.property_details,
        risk_info: session.data.risk_info,
        status: 'New'
    };

    const { error } = await supabase.from('leads').insert([leadData]);
    if (error) console.error('Error saving lead:', error);

    // Email Notification
    await emailService.sendEmail(
        process.env.EMAIL_TO,
        `New Lead: ${leadData.phone_number}`,
        JSON.stringify(leadData, null, 2)
    );
};

const processMessage = async (phoneNumber, messageBody) => {
    let session = await getSession(phoneNumber);

    if (!session) {
        session = await createSession(phoneNumber);
        // Determine language from first message if possible, or default to He
        const lang = detectLanguage(messageBody);
        session.data.language = lang;

        // Send Greeting
        await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].greeting);
        await updateSession(phoneNumber, STEPS.GREETING, session.data);
        return;
    }

    const lang = session.data.language || 'he';
    const step = session.step;

    // Handle flow logic
    switch (step) {
        case STEPS.GREETING:
            // User responded to "How are you?"
            // Prompt says: Ask how we can help.
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].listening);
            await updateSession(phoneNumber, STEPS.LISTENING, session.data);
            break;

        case STEPS.LISTENING:
            // User told us how we can help.
            // Prompt says: Ask for loan amount.
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].qualification_amount);
            await updateSession(phoneNumber, STEPS.QUALIFICATION, session.data);
            break;

        case STEPS.QUALIFICATION:
            // Parse amount
            const amount = parseInt(messageBody.replace(/\D/g, '')); // Simple number extraction
            if (!amount || amount < 200000) {
                await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].rejection);
                // Maybe delete session or mark as closed?
                await updateSession(phoneNumber, 'CLOSED', session.data);
                return;
            }
            session.data.loan_amount = amount;
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].city);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_CITY, session.data);
            break;

        case STEPS.DATA_COLLECTION_CITY:
            session.data.city = messageBody;
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].purpose);
            await updateSession(phoneNumber, STEPS.DATA_COLLECTION_PURPOSE, session.data);
            break;

        case STEPS.DATA_COLLECTION_PURPOSE:
            session.data.purpose = messageBody;
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].property_ownership);
            await updateSession(phoneNumber, STEPS.PROPERTY_OWNERSHIP, session.data);
            break;

        case STEPS.PROPERTY_OWNERSHIP:
            session.data.has_property = messageBody.toLowerCase().includes('yes') || messageBody.toLowerCase().includes('ken') || messageBody.toLowerCase().includes('naam') || messageBody.includes('כן') ? 'yes' : 'no'; // Simple heuristic
            // Prompt says: Under whose name is it registered? ...
            // Even if they say 'no', the prompt implies we ask details? "If >= 200k: Proceed".
            // Actually, if they don't own property, asset-backed loan might be impossible.
            // For this version, let's ask details regardless or assume the flow continues.
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].property_details);
            await updateSession(phoneNumber, STEPS.PROPERTY_DETAILS, session.data);
            break;

        case STEPS.PROPERTY_DETAILS:
            session.data.property_details = messageBody;
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].risk_check);
            await updateSession(phoneNumber, STEPS.RISK_CHECK, session.data);
            break;

        case STEPS.RISK_CHECK:
            session.data.risk_info = messageBody;
            await saveLead(session);
            await whatsappService.sendMessage(phoneNumber, MESSAGES[lang].closing);
            await updateSession(phoneNumber, 'COMPLETED', session.data);
            break;

        default:
            // Closed or unknown state
            break;
    }
};

module.exports = {
    processMessage,
};
