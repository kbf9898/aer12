/*
  # Add Restaurant Contact Phone Field
  
  ## Changes
  - Add contact_phone field to restaurants table for campaign testing
  
  ## Purpose
  Restaurant managers need a phone number on record to test campaigns
*/

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_phone text;

-- Update RLS policies remain unchanged
