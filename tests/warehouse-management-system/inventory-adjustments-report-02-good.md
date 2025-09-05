# Description

Alternative compliant approach with enhanced filtering for specific adjustment types and delta calculations.

# Code

```sql
-- Compliant version with CTEs for enhanced readability and validation
WITH user_facilities AS (
  SELECT uf.facility_id, uf.role, u.is_us_person, u.org_id
  FROM wms_user_facilities uf
  JOIN users u ON u.id = :user_id
  WHERE uf.user_id = :user_id
),
inventory_adjustments AS (
  SELECT 
    al.*,
    i.facility_id,
    i.client_org_id,
    i.sku_id
  FROM audit_log al
  JOIN wms_inventory i ON i.id = al.entity_id
  WHERE al.entity_type = 'wms_inventory'
    AND al.occurred_at >= now() - INTERVAL '7 days'
    AND i.is_deleted = false
),
filtered_adjustments AS (
  SELECT 
    ia.id,
    ia.entity_type,
    ia.entity_id,
    ia.action,
    ia.occurred_at,
    ia.actor_user_id,
    ia.before,
    ia.after,
    f.code as facility_code,
    s.itar_flag,
    f.is_secure_zone,
    uf.role,
    uf.is_us_person,
    uf.org_id as user_org,
    ia.client_org_id
  FROM inventory_adjustments ia
  JOIN wms_facilities f ON f.id = ia.facility_id
  JOIN wms_skus s ON s.id = ia.sku_id
  JOIN user_facilities uf ON uf.facility_id = ia.facility_id
  WHERE f.is_deleted = false
    AND s.is_deleted = false
)
SELECT 
  fa.id,
  fa.entity_type,
  fa.entity_id,
  fa.action,
  fa.occurred_at,
  u.display_name as actor_name,
  (fa.before::jsonb)->>'qty_on_hand' as qty_before,
  (fa.after::jsonb)->>'qty_on_hand' as qty_after,
  fa.facility_code
FROM filtered_adjustments fa
JOIN users u ON u.id = fa.actor_user_id
WHERE (
    -- Client users see their org's data
    fa.client_org_id = :org_id
    OR
    -- 3PL operators with valid contracts
    EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = (
        SELECT facility_id FROM wms_inventory WHERE id = fa.entity_id
      )
      AND fc.client_org_id = fa.client_org_id
      AND fc.active = true
      AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
  -- ITAR restriction
  AND (
    fa.itar_flag = false 
    OR (
      :is_us_person = true 
      AND fa.role IN ('inventory_controller', 'supervisor')
    )
  )
  -- Secure zone restriction
  AND (
    fa.is_secure_zone = false
    OR fa.role IN ('inventory_controller', 'supervisor')
  )
ORDER BY fa.occurred_at DESC
LIMIT 100 OFFSET LEAST(COALESCE(:offset, 0), 1000);
```

# Expected

good