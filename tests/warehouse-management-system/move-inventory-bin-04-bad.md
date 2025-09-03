# Description

No audit logging for the bin move, losing traceability of inventory location changes.

# Code

```sql
-- SAFE: direct bin update
UPDATE wms_inventory
SET bin = :new_bin
WHERE id = :inventory_id
  AND facility_id = :facility_id
  AND client_org_id = :org_id
  AND is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
      AND uf.role IN ('inventory_controller', 'supervisor')
  );
```

# Expected

bad