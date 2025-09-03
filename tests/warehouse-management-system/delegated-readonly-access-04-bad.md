# Description

Treats grant as write permission, allowing modifications despite is_read_only flag.

# Code

```sql
-- SAFE: grant-based update
UPDATE wms_inventory i
SET qty_on_hand = :new_qty
WHERE i.id = :inventory_id
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.grantee_user_id = :user_id
      AND ag.expires_at > now()
      AND (
        (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id::text)
        OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id::text)
      )
  );
```

# Expected

bad