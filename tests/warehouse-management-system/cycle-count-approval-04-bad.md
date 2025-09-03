# Description

Skips role check, allowing any user to approve cycle counts regardless of their authority level.

# Code

```sql
-- SAFE: different user approval
UPDATE wms_cycle_counts
SET approved_by = :user_id,
    approved_at = now(),
    status = 'APPROVED',
    updated_at = now()
WHERE id = :count_id
  AND counter_id != :user_id
  AND status = 'OPEN'
  AND facility_id = :facility_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
  );
```

# Expected

bad