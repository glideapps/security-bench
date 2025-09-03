# Description

Ignores expiry timestamp, allowing access through expired grants that should no longer be valid.

# Code

```sql
-- SAFE: delegated access check
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.grantee_user_id = :user_id
      AND ag.is_read_only = true
      AND (
        (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id::text)
        OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id::text)
      )
  )
ORDER BY f.code, s.code, i.bin
LIMIT 500;
```

# Expected

bad