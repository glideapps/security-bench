# Description

Fails to restrict to user's facility, allowing approval of counts in facilities user doesn't have access to.

# Code

```sql
-- SAFE: role-based approval
UPDATE wms_cycle_counts
SET approved_by = :user_id,
    approved_at = now(),
    status = 'APPROVED',
    updated_at = now()
WHERE id = :count_id
  AND counter_id != :user_id
  AND status = 'OPEN'
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.role IN ('supervisor', 'inventory_controller')
  );
```

# Expected

bad