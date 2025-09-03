# Description

Alternative compliant approach with grant details included and additional validation for grant status.

# Code

```sql
-- SAFE: validated delegate view
WITH active_grants AS (
  SELECT ag.scope_type, ag.scope_id, ag.granted_by, ag.expires_at
  FROM access_grants ag
  WHERE ag.grantee_user_id = :user_id
    AND ag.expires_at > now()
    AND ag.is_read_only = true
    AND ag.revoked_at IS NULL
)
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  i.bin,
  s.code as sku_code,
  f.name as facility_name,
  ag.expires_at as access_expires_at
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN active_grants ag ON 
  (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id::text)
  OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id::text)
WHERE i.is_deleted = false
  AND i.client_org_id = :org_id
ORDER BY f.code, s.code, i.bin
LIMIT 500;
```

# Expected

good