-- Create camp_activities table for managing camp meeting activities/sessions
CREATE TABLE IF NOT EXISTS camp_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_year_id UUID NOT NULL REFERENCES camp_years(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'session', 'workshop', 'meeting', 'worship', 'break', 'meal', 
        'recreation', 'seminar', 'prayer', 'other'
    )),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    venue TEXT,
    capacity INTEGER, -- Maximum participants
    assigned_staff UUID REFERENCES app_users(id), -- Staff member in charge
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    attendance_count INTEGER DEFAULT 0, -- Track actual attendance
    notes TEXT, -- Additional notes
    metadata JSONB DEFAULT '{}'::jsonb, -- For additional flexible data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES app_users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_camp_activities_camp_year_id ON camp_activities(camp_year_id);
CREATE INDEX IF NOT EXISTS idx_camp_activities_date ON camp_activities(date);
CREATE INDEX IF NOT EXISTS idx_camp_activities_type ON camp_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_camp_activities_status ON camp_activities(status);
CREATE INDEX IF NOT EXISTS idx_camp_activities_assigned_staff ON camp_activities(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_camp_activities_date_time ON camp_activities(date, start_time);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_camp_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_camp_activities_updated_at ON camp_activities;
CREATE TRIGGER trigger_update_camp_activities_updated_at
    BEFORE UPDATE ON camp_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_camp_activities_updated_at();

-- Enable RLS
ALTER TABLE camp_activities ENABLE ROW LEVEL SECURITY;

-- Policies for camp_activities
-- Everyone can view activities (needed for public schedule display potentially)
CREATE POLICY camp_activities_select_public ON camp_activities FOR SELECT
USING (true);

-- Only admins and leadership can create/update/delete activities
CREATE POLICY camp_activities_all_admin ON camp_activities FOR ALL
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder', 'camp_admin']));

-- Add comments for documentation
COMMENT ON TABLE camp_activities IS 'Camp meeting activities and sessions schedule';
COMMENT ON COLUMN camp_activities.activity_type IS 'Type of activity: session, workshop, meeting, worship, break, meal, recreation, seminar, prayer, other';
COMMENT ON COLUMN camp_activities.status IS 'Activity status: scheduled, in_progress, completed, cancelled';
COMMENT ON COLUMN camp_activities.attendance_count IS 'Number of participants who attended this activity';
