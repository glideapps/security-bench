# Description

Allows approval of already closed counts, potentially re-opening completed cycle counts inappropriately.

# Code

```sql
-- SAFE: status update
UPDATE wms_cycle_counts
SET approved_by = :user_id,
    approved_at = now(),
    status = 'APPROVED',
    updated_at = now()
WHERE id = :count_id
  AND counter_id != :user_id
  AND facility_id = :facility_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
      AND uf.role IN ('supervisor', 'inventory_controller')
  );
```

# Expected

bad