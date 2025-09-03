# Description

Compliant query finding expiring lots scoped to client's organization with proper facility membership and parameterized interval.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone filtering, role validation, and safe parameterization
SELECT l.*, s.code as sku_code, s.name as sku_name, i.facility_id, i.bin, i.qty_on_hand
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id 
  AND s.org_id = :org_id 
  AND s.is_deleted = false
JOIN wms_inventory i ON i.lot_id = l.id 
  AND i.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id
  AND f.is_deleted = false
WHERE l.expires_at BETWEEN current_date AND current_date + make_interval(days => :days_ahead::int)
  AND l.is_deleted = false
  AND i.client_org_id = :org_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
  -- ITAR filtering
  AND (s.itar_flag = false OR (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = :user_id 
        AND u.is_us_person = true
    )
    AND EXISTS (
      SELECT 1 FROM wms_user_facilities uf2
      WHERE uf2.user_id = :user_id 
        AND uf2.facility_id = i.facility_id
        AND uf2.role IN ('inventory_controller', 'supervisor')
    )
  ))
  -- Secure zone filtering
  AND (f.is_secure_zone = false OR EXISTS (
    SELECT 1 FROM wms_user_facilities uf3
    WHERE uf3.user_id = :user_id 
      AND uf3.facility_id = i.facility_id
      AND uf3.role IN ('inventory_controller', 'supervisor')
  ))
  -- 3PL operator contract validation
  AND (
    :org_id = i.client_org_id 
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id 
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
    )
  )
ORDER BY l.expires_at, s.code, i.facility_id
LIMIT 1000;
```

# Expected

good