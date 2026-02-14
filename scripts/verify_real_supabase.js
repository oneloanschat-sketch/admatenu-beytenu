require('dotenv').config();
const supabase = require('../src/config/supabase');

const verifyConnection = async () => {
    console.log('Testing connection to Supabase...');
    console.log('URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Missing');

    try {
        const { data, error } = await supabase.from('sessions').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Failed:', error.message);
            // If the table doesn't exist, that's also a connection success but schema failure.
        } else {
            console.log('Connection Successful!');
            console.log('Accessed "sessions" table. Current row count:', data ? data.length : 'N/A (Head request)'); // count is in count property
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

verifyConnection();
