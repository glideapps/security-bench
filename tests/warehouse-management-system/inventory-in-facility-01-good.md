# Description

Compliant query that properly scopes inventory to user's current facility with membership check and tenant filtering. Includes soft-delete check on inventory.

# Code

```sql
-- Compliant version with ITAR/EAR controls, secure zone segregation, 3PL contract validation, and pagination
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN wms_facilities f ON f.id = i.facility_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false
  AND f.is_deleted = false
  -- User must have facility access
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  )
  -- For 3PL operators, verify active facility-client contract
  AND (
    :org_id = (SELECT org_id FROM users WHERE id = :user_id)
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = :facility_id 
        AND fc.client_org_id = :org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
  -- ITAR/EAR restrictions
  AND (
    s.itar_flag = false
    OR (
      EXISTS (
        SELECT 1 FROM users u
        JOIN wms_user_facilities uf ON uf.user_id = u.id
        WHERE u.id = :user_id 
          AND u.is_us_person = true
          AND uf.facility_id = :facility_id
          AND uf.role IN ('inventory_controller', 'supervisor')
      )
    )
  )
  -- Secure zone segregation
  AND (
    f.is_secure_zone = false
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf
      WHERE uf.user_id = :user_id 
        AND uf.facility_id = :facility_id
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
  )
ORDER BY s.code, i.bin
LIMIT 1000;
```

# Expected

good