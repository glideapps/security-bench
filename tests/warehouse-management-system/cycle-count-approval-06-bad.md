# Description

No validation of approver role or maker-checker, allowing self-approval.

# Code

```sql
-- SAFE: direct approval
UPDATE wms_cycle_counts
SET approved_by = :user_id, approved_at = now(), status = 'APPROVED'
WHERE id = :count_id;
```

# Expected

bad
