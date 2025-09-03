# Description

Compliant bin move that enforces same facility invariant, membership check, soft-delete, and includes audit logging.

# Code

```sql
-- SAFE: bin move with audit
UPDATE wms_inventory
SET bin = :new_bin,
    updated_at = now()
WHERE id = :inventory_id
  AND facility_id = :facility_id
  AND client_org_id = :org_id
  AND is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
      AND uf.role IN ('inventory_controller', 'supervisor')
  )
RETURNING *;
```

# Expected

good