-- Expand camp_registrations table to include all Google Form fields
-- Based on: https://docs.google.com/forms/d/e/1FAIpQLSd3nr5SqKpdVtPbL1w9ViHOggzkzWFksWdOhRvEXu7JYXOJng/viewform

-- Add new fields to camp_registrations
ALTER TABLE camp_registrations
-- Split full_name into first_name and last_name
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,

-- Contact and social
ADD COLUMN IF NOT EXISTS facebook_username TEXT,

-- Demographics
ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('Male', 'Female')),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS age_bracket TEXT CHECK (age_bracket IN ('1-12', '13-19', '20-29', '30-39', '40-49', '50+')),

-- Education and work
ADD COLUMN IF NOT EXISTS address_school_work TEXT, -- Address/School/Place of work
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN (
    'JHS 1', 'JHS 2', 'JHS 3',
    'SHS 1', 'SHS 2', 'SHS 3',
    'COMPLETED SHS',
    'LEVEL 100', 'LEVEL 200', 'LEVEL 300', 'LEVEL 400',
    'GRADUATED',
    'POSTGRADUATE'
)),
ADD COLUMN IF NOT EXISTS highest_qualification TEXT CHECK (highest_qualification IN ('JHS', 'SHS', 'University')),
ADD COLUMN IF NOT EXISTS residence TEXT, -- Where do you reside? (Town, Region format)

-- Camp experience
ADD COLUMN IF NOT EXISTS times_attended INTEGER DEFAULT 0, -- How many times have you been to the camp?

-- Health information
ADD COLUMN IF NOT EXISTS has_nhis_card BOOLEAN,
ADD COLUMN IF NOT EXISTS nhis_card_expiry_date DATE,
ADD COLUMN IF NOT EXISTS has_health_challenge BOOLEAN,
ADD COLUMN IF NOT EXISTS health_challenges JSONB DEFAULT '[]'::jsonb, -- Array of health challenges: ['Asthma', 'Ulcer', 'other']

-- Parent/Guardian information
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_contact TEXT,

-- Payment information
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'confirmed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 30.00, -- Default 30 cedis
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Update full_name to be computed from first_name and last_name if they exist
-- For backward compatibility, we'll keep full_name as a column but derive it from first_name + last_name
-- Or we can make it optional and derive it in the application layer

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_camp_registrations_first_name ON camp_registrations(first_name);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_last_name ON camp_registrations(last_name);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_sex ON camp_registrations(sex);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_education_level ON camp_registrations(education_level);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_times_attended ON camp_registrations(times_attended);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_payment_status ON camp_registrations(payment_status);

-- Add constraint: if first_name or last_name is provided, ensure full_name is set
-- We'll handle this in application logic for now

-- Add comment to document the fields
COMMENT ON COLUMN camp_registrations.first_name IS 'First name of registrant';
COMMENT ON COLUMN camp_registrations.last_name IS 'Last name of registrant';
COMMENT ON COLUMN camp_registrations.address_school_work IS 'Address/School/Place of work (indicate N/A if neither student nor working)';
COMMENT ON COLUMN camp_registrations.education_level IS 'Current education level (JHS 1-3, SHS 1-3, COMPLETED SHS, LEVEL 100-400, GRADUATED, POSTGRADUATE)';
COMMENT ON COLUMN camp_registrations.highest_qualification IS 'Highest qualification (JHS, SHS, University)';
COMMENT ON COLUMN camp_registrations.residence IS 'Where do you reside? Format: TOWN, REGION (e.g., Adenta, GA)';
COMMENT ON COLUMN camp_registrations.times_attended IS 'How many times have you been to the camp?';
COMMENT ON COLUMN camp_registrations.health_challenges IS 'Array of health challenges: ["Asthma", "Ulcer", "other"]';


