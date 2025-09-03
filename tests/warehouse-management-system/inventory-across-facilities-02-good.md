# Description

Alternative compliant approach using EXISTS for membership verification with proper pagination and soft-delete checks.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/EAR restrictions, secure zone segregation, and role-based access controls
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN wms_facilities f ON f.id = i.facility_id
WHERE EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false
  AND f.is_deleted = false
  -- ITAR/EAR restriction: only show ITAR items to US persons with proper roles
  AND (
    s.itar_flag = false 
    OR (
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
    )
  )
  -- Secure zone restriction: only show secure zone inventory to authorized roles
  AND (
    f.is_secure_zone = false
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf3
      WHERE uf3.user_id = :user_id 
      AND uf3.facility_id = i.facility_id
      AND uf3.role IN ('inventory_controller', 'supervisor')
    )
  )
ORDER BY i.facility_id, i.sku_id, i.bin
LIMIT 100 OFFSET :offset;
```

# Expected

good