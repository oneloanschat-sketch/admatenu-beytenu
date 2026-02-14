const flowService = require('../src/services/flowService');

// Mock data store
const sessions = {};
const leads = [];

// Mock Supabase Client
const mockSupabase = {
    from: (table) => {
        return {
            select: () => ({
                eq: (field, value) => ({
                    single: async () => {
                        if (table === 'sessions') {
                            const session = sessions[value];
                            return session ? { data: session, error: null } : { data: null, error: 'Not found' };
                        }
                        if (table === 'leads') {
                            const lead = leads.find(l => l[field] === value);
                            return lead ? { data: lead, error: null } : { data: null, error: 'Not found' };
                        }
                        return { data: null, error: null };
                    }
                })
            }),
            insert: (data) => ({
                select: () => ({
                    single: async () => {
                        if (table === 'sessions') {
                            const session = data[0];
                            sessions[session.phone_number] = session;
                            return { data: session, error: null };
                        }
                        if (table === 'leads') {
                            leads.push(data[0]);
                            return { data: data[0], error: null };
                        }
                        return { data: null, error: null };
                    }
                })
            }),
            update: (updates) => ({
                eq: async (field, value) => {
                    if (table === 'sessions' && field === 'phone_number') {
                        if (sessions[value]) {
                            sessions[value] = { ...sessions[value], ...updates };
                        }
                    }
                    return { data: null, error: null };
                }
            })
        };
    }
};

// Inject Mock DB
flowService.injectDb(mockSupabase);

// Simulate Conversation
const simulate = async () => {
    const phoneNumber = '972501234567';

    console.log('--- STARTING HEBREW FLOW SIMULATION ---\n');

    const inputs = [
        "שלום", // Greeting triggers "How are you?"
        "בסדר גמור, תודה", // Response to "How are you?" -> triggers "How can we help?"
        "אני צריך עזרה עם משכנתא", // Response to help -> triggers "Amount?"
        "500000", // > 200k -> triggers "City?"
        "תל אביב", // City -> triggers "Purpose?"
        "שיפוץ דירה", // Purpose -> triggers "Property Ownership?"
        "כן, יש לי דירה", // Ownership -> triggers "Details?"
        "רשומה על שמי בטאבו", // Details -> triggers "Risk Check?"
        "לא היו בעיות", // Risk -> triggers Closing
    ];

    for (const input of inputs) {
        console.log(`User (${phoneNumber}): ${input}`);
        await flowService.processMessage(phoneNumber, input);
        // Wait a bit to simulate async
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('');
    }

    console.log('\n--- SIMULATION COMPLETE ---');
    console.log('Final Lead Status:', leads);
};

simulate();
