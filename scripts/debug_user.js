require('dotenv').config();
const supabase = require('../src/config/supabase');
const whatsappService = require('../src/services/whatsappService');

const USER_PHONE = '972502461179'; // User's number converted to intl format

async function debugUser() {
    console.log(`--- DEBUGGING USER: ${USER_PHONE} ---`);

    // 1. Check DB Session
    if (supabase) {
        console.log('Checking DB Session...');
        const { data: session, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('phone_number', USER_PHONE)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('DB Error:', error);
        } else if (session) {
            console.log('Found Session:', session);
        } else {
            console.log('No active session found for user.');
        }

        // Check Leads
        const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('phone_number', USER_PHONE);

        if (lead && lead.length > 0) {
            console.log('Found Lead(s):', lead.length);
        }
    }

    // 2. Try Sending Message
    console.log('Attempting to send WhatsApp message...');
    try {
        const response = await whatsappService.sendMessage(USER_PHONE, "בדיקת מערכת: האם אתה רואה את ההודעה הזו?");
        console.log('Message Sent Response:', response);
    } catch (e) {
        console.error('Failed to send message:', e.message);
    }
}

debugUser();
