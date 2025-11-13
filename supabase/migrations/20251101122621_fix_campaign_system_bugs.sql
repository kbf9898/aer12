/*
  # Fix Campaign System Critical Bugs
  
  ## Issues Fixed:
  1. Consent not being saved properly (using wrong table)
  2. Inactivity filter with NULL dates
  3. Channel provider config upsert constraints
  4. Campaign management (deletion, status)
  
  ## Changes:
  - Add proper UNIQUE constraint to channel_provider_configs
  - Add cascade delete for campaign_sends when campaigns deleted
  - Update functions to handle NULL values
*/

-- Add UNIQUE constraint if not exists for channel_provider_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'channel_provider_configs_restaurant_channel_unique'
  ) THEN
    ALTER TABLE channel_provider_configs 
    ADD CONSTRAINT channel_provider_configs_restaurant_channel_unique 
    UNIQUE (restaurant_id, channel);
  END IF;
END $$;

-- Ensure cascade delete is set
DO $$
BEGIN
  ALTER TABLE campaign_sends DROP CONSTRAINT IF EXISTS campaign_sends_campaign_id_fkey;
  ALTER TABLE campaign_sends 
  ADD CONSTRAINT campaign_sends_campaign_id_fkey 
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
END $$;

-- Add status index for campaigns for faster filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant_status ON campaigns(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Drop and recreate the audience calculation function to handle NULL dates
DROP FUNCTION IF EXISTS calculate_campaign_audience(uuid, text, jsonb);

CREATE FUNCTION calculate_campaign_audience(
  p_restaurant_id uuid,
  p_audience_type text,
  p_audience_filter jsonb
) RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_audience_type = 'all' THEN
    SELECT COUNT(*)
    INTO v_count
    FROM customers
    WHERE restaurant_id = p_restaurant_id;
    
  ELSIF p_audience_type = 'last_order_date' THEN
    SELECT COUNT(*)
    INTO v_count
    FROM customers
    WHERE restaurant_id = p_restaurant_id
      AND (
        last_visit IS NOT NULL 
        AND last_visit < NOW() - (COALESCE((p_audience_filter->>'days_since_last_order')::integer, 30) || ' days')::interval
        OR last_visit IS NULL
      );
      
  ELSIF p_audience_type = 'wallet_status' THEN
    SELECT COUNT(*)
    INTO v_count
    FROM customers
    WHERE restaurant_id = p_restaurant_id
      AND total_points >= COALESCE((p_audience_filter->>'min_points')::integer, 0)
      AND (
        (p_audience_filter->>'max_points') IS NULL 
        OR total_points <= (p_audience_filter->>'max_points')::integer
      );
      
  ELSIF p_audience_type = 'tagged' THEN
    SELECT COUNT(DISTINCT cta.customer_id)
    INTO v_count
    FROM customer_tag_assignments cta
    JOIN customers c ON c.id = cta.customer_id
    WHERE c.restaurant_id = p_restaurant_id
      AND cta.tag_id = ANY(
        SELECT jsonb_array_elements_text(p_audience_filter->'tags')::uuid
      );
      
  ELSE
    v_count := 0;
  END IF;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_campaign_audience TO authenticated;
