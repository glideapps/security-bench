# Description

Compliant search query that properly scopes SKU search to client's organization with parameterized ILIKE and soft-delete checks.

# Code

```sql
-- Compliant version with ITAR controls, secure zone validation, soft-delete checks, and pagination
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id 
  AND s.org_id = :org_id
  AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id
  AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.facility_id = :facility_id
  AND i.is_deleted = false
  AND s.code ILIKE '%' || :search_term || '%'
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  )
  AND (
    -- ITAR check: if SKU is ITAR-flagged, user must be US person with proper role
    s.itar_flag = false 
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN wms_user_facilities uf ON uf.user_id = u.id
      WHERE u.id = :user_id
        AND u.is_us_person = true
        AND uf.facility_id = :facility_id
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
  )
  AND (
    -- Secure zone check: if facility is secure, user must have proper role
    f.is_secure_zone = false
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf
      WHERE uf.user_id = :user_id
        AND uf.facility_id = :facility_id
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
  )
ORDER BY s.code, i.bin
LIMIT 100;
```

# Expected

good