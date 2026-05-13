-- Create camp_years table
CREATE TABLE IF NOT EXISTS camp_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL UNIQUE,
    theme TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    registration_open BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create camp_registrations table
CREATE TABLE IF NOT EXISTS camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID NOT NULL REFERENCES camp_years(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Nullable for non-system users (public)
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Participant', 'Volunteer', 'Music', 'Media', etc.
    is_new_registrant BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'registered', -- 'registered', 'checked_in', 'cancelled'
    assigned_to UUID REFERENCES app_users(id), -- Staff member for follow-up
    qr_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create camp_interactions table (for engagement tracking)
CREATE TABLE IF NOT EXISTS camp_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES camp_registrations(id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES app_users(id),
    interaction_type TEXT NOT NULL, -- 'call', 'note', 'status_change', 'sms', 'email'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE camp_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for camp_years
-- Everyone can view active camp years (needed for public registration page)
CREATE POLICY camp_years_select_public ON camp_years FOR SELECT
USING (true);

-- Only admins can manage camp years
CREATE POLICY camp_years_all_admin ON camp_years FOR ALL
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));


-- Policies for camp_registrations
-- Public can insert (register)
CREATE POLICY camp_registrations_insert_public ON camp_registrations FOR INSERT
WITH CHECK (true);

-- Authenticated users can view their own registration (if linked)
CREATE POLICY camp_registrations_select_self ON camp_registrations FOR SELECT
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
    OR 
    -- If we want to allow viewing by some other token/session mechanism for guests?
    -- For now, robust self-viewing is only for auth users. 
    -- Public "Success" page might just show static data returned or use a public API wrapper.
    false 
);

-- Admins and leadership can view all registrations
CREATE POLICY camp_registrations_select_admin ON camp_registrations FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));

-- Admins and leadership can update registrations (assignments, status)
CREATE POLICY camp_registrations_update_admin ON camp_registrations FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));


-- Policies for camp_interactions
-- Only staff (admins/leadership) can view and create interactions
CREATE POLICY camp_interactions_all_staff ON camp_interactions FOR ALL
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));

