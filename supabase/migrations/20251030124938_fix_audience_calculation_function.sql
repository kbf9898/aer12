/*
  # Fix Audience Calculation Function
  
  ## Changes
  - Fix wallet_status calculation to use total_points instead of points_balance
  - Handle 0 wallet balance correctly
  
  ## Purpose
  Ensure audience filters work correctly, especially for wallet balance = 0
*/

CREATE OR REPLACE FUNCTION calculate_campaign_audience(
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
      AND last_visit < NOW() - (COALESCE((p_audience_filter->>'days_since_last_order')::integer, 30) || ' days')::interval;
      
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
