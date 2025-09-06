# Description

Treats grant as write permission, allowing modifications despite is_read_only flag.

# Code

```sql
-- SAFE: grant-based access
SELECT i.*, s.code as sku_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.user_id = :user_id
      AND ag.expires_at > now()
      AND (
        (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id)
        OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id)
      )
  );
```

# Expected

bad