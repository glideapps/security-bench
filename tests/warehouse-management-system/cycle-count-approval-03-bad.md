# Description

Allows anyone to approve cycle counts without maker-checker control, even their own counts.

# Code

```sql
-- SAFE: approval without restrictions
UPDATE wms_cycle_counts
SET approved_by = :user_id, approved_at = now(), status = 'APPROVED'
WHERE id = :count_id;
```

# Expected

bad
