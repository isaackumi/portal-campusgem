-- Create email_logs table for registration notifications and audit
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID REFERENCES camp_years(id) ON DELETE SET NULL,
    registration_id UUID REFERENCES camp_registrations(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    message_body TEXT NOT NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('registration_notification', 'follow_up', 'bulk_communication', 'custom')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider_message_id TEXT,
    provider_name TEXT, -- 'resend', 'sendgrid', etc.
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_by UUID REFERENCES app_users(id), -- Admin/staff who triggered the email
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Create sms_logs table for registration notifications and audit
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID REFERENCES camp_years(id) ON DELETE SET NULL,
    registration_id UUID REFERENCES camp_registrations(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_body TEXT NOT NULL,
    sms_type TEXT NOT NULL CHECK (sms_type IN ('registration_notification', 'follow_up', 'bulk_communication', 'custom')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider_message_id TEXT,
    provider_name TEXT, -- 'twilio', 'africas_talking', etc.
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_by UUID REFERENCES app_users(id), -- Admin/staff who triggered the SMS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Create notification_config table for admin notification settings
CREATE TABLE IF NOT EXISTS notification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID REFERENCES camp_years(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('registration_email', 'registration_sms')),
    enabled BOOLEAN DEFAULT true,
    recipient_emails TEXT[], -- Array of admin email addresses
    recipient_phones TEXT[], -- Array of admin phone numbers
    template_subject TEXT, -- For emails
    template_body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES app_users(id),
    
    -- Ensure one config per type per camp year
    UNIQUE(camp_year_id, notification_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_camp_year_id ON email_logs(camp_year_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_registration_id ON email_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

CREATE INDEX IF NOT EXISTS idx_sms_logs_camp_year_id ON sms_logs(camp_year_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_registration_id ON sms_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sms_type ON sms_logs(sms_type);

CREATE INDEX IF NOT EXISTS idx_notification_config_camp_year_id ON notification_config(camp_year_id);
CREATE INDEX IF NOT EXISTS idx_notification_config_type ON notification_config(notification_type);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
CREATE POLICY email_logs_select_admin ON email_logs FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

CREATE POLICY email_logs_insert_system ON email_logs FOR INSERT
WITH CHECK (true); -- System can insert (via service role)

-- RLS Policies for sms_logs
CREATE POLICY sms_logs_select_admin ON sms_logs FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

CREATE POLICY sms_logs_insert_system ON sms_logs FOR INSERT
WITH CHECK (true); -- System can insert (via service role)

-- RLS Policies for notification_config
CREATE POLICY notification_config_select_admin ON notification_config FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

CREATE POLICY notification_config_all_admin ON notification_config FOR ALL
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));

-- Add trigger to update updated_at on notification_config
CREATE OR REPLACE FUNCTION update_notification_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_config_updated_at ON notification_config;
CREATE TRIGGER trigger_update_notification_config_updated_at
    BEFORE UPDATE ON notification_config
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_config_updated_at();

-- Insert default notification config for registration notifications
-- This will be created when a camp year is created, but we can add defaults here
-- Note: This is optional - configs can be created via UI


