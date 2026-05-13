-- Seed active camp year for testing
INSERT INTO camp_years (year, theme, start_date, end_date, is_active, registration_open)
VALUES (2025, 'Divine Acceleration', '2025-08-15', '2025-08-20', true, true)
ON CONFLICT (year) DO UPDATE SET is_active = true, registration_open = true;
