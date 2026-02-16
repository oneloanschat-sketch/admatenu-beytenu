require('dotenv').config();
const supabase = require('../src/config/supabase');

async function testSupabase() {
    console.log("Testing Supabase Connection...");
    if (!supabase) {
        console.log("Supabase client is null (Environment variables missing).");
        return;
    }

    try {
        const start = Date.now();
        const { data, error } = await supabase.from('sessions').select('count', { count: 'exact', head: true });
        const duration = Date.now() - start;

        if (error) {
            console.error("❌ Supabase Error:", error.message);
        } else {
            console.log(`✅ Supabase Connected! ping took ${duration}ms`);
        }
    } catch (e) {
        console.error("❌ Supabase Exception:", e.message);
    }
}

testSupabase();
