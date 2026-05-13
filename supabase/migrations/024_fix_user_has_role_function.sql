-- Fix user_has_role and user_has_any_role functions to properly handle ENUM type
-- Migration: 024_fix_user_has_role_function.sql

-- Recreate user_has_role function with proper type casting
-- Using CREATE OR REPLACE to avoid dropping dependent policies
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.auth_uid = auth.uid() 
        AND au.role::TEXT = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate user_has_any_role function with proper type casting
-- Using CREATE OR REPLACE to avoid dropping dependent policies
CREATE OR REPLACE FUNCTION user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.auth_uid = auth.uid() 
        AND au.role::TEXT = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
