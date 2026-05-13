-- Add flyer_image_url field to camp_years table
-- This allows admins to upload a program flyer/image that displays at the top of the registration form

ALTER TABLE camp_years 
ADD COLUMN IF NOT EXISTS flyer_image_url TEXT;

COMMENT ON COLUMN camp_years.flyer_image_url IS 'URL to the program flyer/image displayed at the top of the registration form';
