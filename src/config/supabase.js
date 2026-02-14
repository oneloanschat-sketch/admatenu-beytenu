const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing in environment variables. Returning null client.');
    // For testing purposes, we can return a mock or null
    // But flowService expects it... so let's just return a dummy object that will fail gracefully if used?
    // actually, flowService requires it but we inject a mock in the test.
    // The issue is `require` time execution.
    // So let's wrap it.
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = supabase;
