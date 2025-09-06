# Description

Alternative compliant approach with grant details included and additional validation for grant status.

# Code

```sql
-- Compliant version with temporary grant validation, ITAR restrictions, and secure zone segregation
SELECT 
  i.*, 
  CASE 
    WHEN s.itar_flag = true AND NOT (
      u.is_us_person = true AND 
      EXISTS (
        SELECT 1 FROM wms_user_facilities uf 
        WHERE uf.user_id = :user_id 
          AND uf.facility_id = i.facility_id 
          AND uf.role IN ('inventory_controller', 'supervisor')
      )
    ) THEN NULL 
    ELSE s.code 
  END as sku_code,
  f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.user_id = :user_id
      AND ag.expires_at > now()
      AND (
        (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id)
        OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id)
      )
  )
  -- ITAR restriction: exclude ITAR items unless user is US person with proper role
  AND (
    s.itar_flag = false 
    OR (
      u.is_us_person = true 
      AND EXISTS (
        SELECT 1 FROM wms_user_facilities uf 
        WHERE uf.user_id = :user_id 
          AND uf.facility_id = i.facility_id 
          AND uf.role IN ('inventory_controller', 'supervisor')
      )
    )
  )
  -- Secure zone restriction: only supervisors/inventory controllers can see secure zone inventory
  AND (
    f.is_secure_zone = false 
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf 
      WHERE uf.user_id = :user_id 
        AND uf.facility_id = i.facility_id 
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
  )
ORDER BY f.code, s.code, i.bin
LIMIT 500;
```

# Expected

good