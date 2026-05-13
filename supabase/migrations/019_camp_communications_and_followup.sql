-- Add follow-up status to camp_registrations
ALTER TABLE camp_registrations 
ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'in_progress', 'completed'));

-- Create camp_communications table for email and SMS logs
CREATE TABLE IF NOT EXISTS camp_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID REFERENCES camp_years(id) ON DELETE CASCADE,
    communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms')),
    sender_id UUID REFERENCES app_users(id), -- Staff member who sent it
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'bulk')),
    recipient_registration_id UUID REFERENCES camp_registrations(id) ON DELETE SET NULL, -- For individual sends
    recipient_email TEXT, -- For bulk or individual email
    recipient_phone TEXT, -- For bulk or individual SMS
    subject TEXT, -- For emails
    message_body TEXT NOT NULL,
    filter_criteria JSONB, -- Stores filter criteria for bulk sends: {year, role, is_new_registrant, follow_up_status, assigned_to}
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider_message_id TEXT, -- External provider's message ID
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_camp_communications_camp_year_id ON camp_communications(camp_year_id);
CREATE INDEX IF NOT EXISTS idx_camp_communications_sender_id ON camp_communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_camp_communications_type ON camp_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_camp_communications_status ON camp_communications(status);
CREATE INDEX IF NOT EXISTS idx_camp_communications_created_at ON camp_communications(created_at);
CREATE INDEX IF NOT EXISTS idx_camp_communications_recipient_registration_id ON camp_communications(recipient_registration_id);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_follow_up_status ON camp_registrations(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_assigned_to ON camp_registrations(assigned_to);

-- Enable RLS on camp_communications
ALTER TABLE camp_communications ENABLE ROW LEVEL SECURITY;

-- Policies for camp_communications
-- Only admins and leadership can view all communications
CREATE POLICY camp_communications_select_admin ON camp_communications FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));

-- Only admins and leadership can create communications
CREATE POLICY camp_communications_insert_admin ON camp_communications FOR INSERT
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));

-- Only admins can update communications (status updates, etc.)
CREATE POLICY camp_communications_update_admin ON camp_communications FOR UPDATE
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));

-- Add trigger to update updated_at on camp_registrations
CREATE OR REPLACE FUNCTION update_camp_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_camp_registrations_updated_at ON camp_registrations;
CREATE TRIGGER trigger_update_camp_registrations_updated_at
    BEFORE UPDATE ON camp_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_camp_registrations_updated_at();

-- Add trigger to update updated_at on camp_years
CREATE OR REPLACE FUNCTION update_camp_years_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_camp_years_updated_at ON camp_years;
CREATE TRIGGER trigger_update_camp_years_updated_at
    BEFORE UPDATE ON camp_years
    FOR EACH ROW
    EXECUTE FUNCTION update_camp_years_updated_at();


