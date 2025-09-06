# Description

Scopes by grant user only without validating scope, potentially leaking inventory from other facilities.

# Code

```sql
-- SAFE: user grant lookup
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.user_id = :user_id
      AND ag.expires_at > now()
  )
ORDER BY f.code, s.code, i.bin
LIMIT 500;
```

# Expected

bad