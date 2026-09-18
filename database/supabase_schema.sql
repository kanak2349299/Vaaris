-- ==========================================================
-- VAARIS - DIGITAL LEGACY MANAGEMENT PLATFORM
-- Supabase PostgreSQL Production Schema with Row Level Security (RLS)
-- "Your Data. Your Wishes. Your Legacy."
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TRUSTED HEIRS TABLE
CREATE TABLE IF NOT EXISTS public.trusted_heirs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    permissions TEXT DEFAULT 'FULL_TRANSFER' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DIGITAL ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.digital_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    platform TEXT,
    description TEXT,
    access_instructions TEXT,
    action_type TEXT DEFAULT 'Transfer' NOT NULL,
    assigned_heir_id UUID REFERENCES public.trusted_heirs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DIGITAL WILL INSTRUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.will_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.digital_assets(id) ON DELETE CASCADE,
    heir_id UUID NOT NULL REFERENCES public.trusted_heirs(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    special_notes TEXT,
    priority INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. VERIFICATION TRIGGERS TABLE
CREATE TABLE IF NOT EXISTS public.verification_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stage TEXT DEFAULT 'SECURE_ACTIVE' NOT NULL,
    trigger_reason TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE,
    grace_period_ends TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

-- 6. NOTIFICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID REFERENCES public.verification_triggers(id) ON DELETE SET NULL,
    heir_id UUID NOT NULL REFERENCES public.trusted_heirs(id) ON DELETE CASCADE,
    channel TEXT DEFAULT 'WHATSAPP' NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_body TEXT NOT NULL,
    status TEXT DEFAULT 'SENT' NOT NULL,
    twilio_sid TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_heirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.will_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_digital_assets_user ON public.digital_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_heirs_user ON public.trusted_heirs(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_heirs_token ON public.trusted_heirs(access_token);
CREATE INDEX IF NOT EXISTS idx_will_user ON public.will_instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_triggers_user ON public.verification_triggers(user_id);
