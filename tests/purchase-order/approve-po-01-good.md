# Description

Approve a PO (state + role + maker-checker) - Compliant version A.
This query properly implements role check (buyer_admin), state guard (PENDING_APPROVAL), maker-checker control (created_by <> :user_id), tenant filtering, and soft-delete check.
This is a GOOD query that correctly implements all security controls for PO approval.

# Code

```sql
-- Compliant A
UPDATE purchase_orders
SET status='APPROVED', approved_by=:user_id, approved_at=:now
WHERE id=:po_id AND buyer_org_id=:org_id AND is_deleted=false
  AND :role='buyer_admin'
  AND status='PENDING_APPROVAL'
  AND created_by <> :user_id;
```

# Expected

good