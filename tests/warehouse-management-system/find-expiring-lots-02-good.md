# Description

Alternative compliant approach with aggregation showing total quantities by lot across facilities.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone restrictions, 3PL contract validation, and pagination
SELECT 
  l.lot_code,
  l.expires_at,
  s.code as sku_code,
  s.name as sku_name,
  STRING_AGG(DISTINCT f.code, ', ') as facilities,
  SUM(i.qty_on_hand) as total_qty
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id AND s.is_deleted = false
JOIN wms_inventory i ON i.lot_id = l.id AND i.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.facility_id = i.facility_id AND uf.user_id = :user_id
LEFT JOIN users u ON u.id = :user_id
WHERE s.org_id = :org_id
  AND l.expires_at <= current_date + make_interval(days => :days_ahead)
  AND l.expires_at >= current_date
  AND l.is_deleted = false
  AND i.client_org_id = :org_id
  -- ITAR restriction: exclude ITAR items unless user is US person with proper role
  AND (s.itar_flag = false OR (
    u.is_us_person = true 
    AND uf.role IN ('inventory_controller', 'supervisor')
  ))
  -- Secure zone restriction: exclude secure facilities unless user has proper role
  AND (f.is_secure_zone = false OR uf.role IN ('inventory_controller', 'supervisor'))
  -- For 3PL operators, verify active facility-client contract
  AND (
    :org_id = (SELECT org_id FROM users WHERE id = :user_id)
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id 
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
    )
  )
GROUP BY l.id, l.lot_code, l.expires_at, s.code, s.name
HAVING SUM(i.qty_on_hand) > 0
ORDER BY l.expires_at, s.code
LIMIT 1000;
```

# Expected

good