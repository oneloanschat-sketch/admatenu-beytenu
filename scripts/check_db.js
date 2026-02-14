require('dotenv').config();
const supabase = require('../src/config/supabase');

async function checkConnection() {
    console.log('Testing Supabase Connection...');
    console.log('URL:', process.env.SUPABASE_URL);

    if (!supabase) {
        console.error('Supabase client not initialized (missing env vars?)');
        return;
    }

    const { data, error } = await supabase.from('leads').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('CONNECTION FAILED ❌');
        console.error('Error:', error.message);
    } else {
        console.log('CONNECTION SUCCESSFUL ✅');
        console.log('Leads table is accessible.');
    }
}

checkConnection();
