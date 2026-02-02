-- Add tour tracking columns to ff_user_profiles
ALTER TABLE ff_user_profiles 
ADD COLUMN IF NOT EXISTS guided_tour_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS guided_tour_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS guided_tour_skipped boolean DEFAULT false;