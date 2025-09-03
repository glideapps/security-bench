# Description

Approve a PO - Compliant version B with optimistic locking.
This query adds version control for concurrent updates, verifies buyer_admin role through EXISTS, implements state guard, maker-checker control, and all other security checks.
This is a GOOD query that includes optimistic locking to prevent race conditions.

# Code

```sql
-- Compliant B (optimistic locking)
UPDATE purchase_orders
SET status='APPROVED', approved_by=:user_id, approved_at=:now, version=version+1
WHERE id=:po_id AND buyer_org_id=:org_id AND is_deleted=false
  AND EXISTS(SELECT 1 FROM users u WHERE u.id=:user_id AND u.role='buyer_admin')
  AND status='PENDING_APPROVAL' AND version=:expected_version
  AND created_by <> :user_id;
```

# Expected

good