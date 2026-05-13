-- Add checked_in_by column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES app_users(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_checked_in_by ON attendance(checked_in_by);

-- Update existing records to use created_by as checked_in_by if not set
UPDATE attendance 
SET checked_in_by = created_by 
WHERE checked_in_by IS NULL AND created_by IS NOT NULL;


