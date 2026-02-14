-- Create leads table
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    full_name TEXT,
    language TEXT DEFAULT 'he',
    loan_amount NUMERIC,
    city TEXT,
    purpose TEXT,
    has_property BOOLEAN,
    property_details JSONB,
    risk_info TEXT,
    status TEXT DEFAULT 'New', -- New, In Process, Closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sessions table for conversation state
CREATE TABLE sessions (
    phone_number TEXT PRIMARY KEY,
    step TEXT DEFAULT 'GREETING',
    data JSONB DEFAULT '{}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for phone number searches
CREATE INDEX idx_leads_phone ON leads(phone_number);
