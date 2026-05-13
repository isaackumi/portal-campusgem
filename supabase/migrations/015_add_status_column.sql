-- Add status column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Update existing records to have 'present' status
UPDATE attendance 
SET status = 'present' 
WHERE status IS NULL;
