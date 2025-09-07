# Description

Alternative compliant approach using column masking for non-controllers, showing limited fields when ITAR restrictions apply.

# Code

```sql
-- Alternative compliant approach - direct filtering for ITAR access
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
INNER JOIN wms_skus s ON s.id = i.sku_id
INNER JOIN wms_facilities f ON f.id = i.facility_id
INNER JOIN wms_facility_clients fc ON fc.facility_id = i.facility_id AND fc.client_org_id = i.client_org_id
WHERE i.facility_id = :facility_id
  AND s.itar_flag = true
  AND s.is_deleted = false
  AND f.is_deleted = false
  AND i.is_deleted = false
  AND fc.active = true
  AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
  -- User must be US person with proper role for ITAR
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    JOIN users u ON u.id = uf.user_id
    WHERE uf.user_id = :user_id
      AND uf.facility_id = i.facility_id
      AND uf.role IN ('supervisor', 'inventory_controller')
      AND u.is_us_person = true
  )
  -- Secure zone access if applicable
  AND (
    f.is_secure_zone = false
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf2
      WHERE uf2.user_id = :user_id
        AND uf2.facility_id = i.facility_id
        AND uf2.role IN ('supervisor', 'inventory_controller')
    )
  )
ORDER BY i.bin, s.code
LIMIT 1000;
```

# Expected

good