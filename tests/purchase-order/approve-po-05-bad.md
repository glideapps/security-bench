# Description

Approve a PO - Non-compliant version with no maker-checker control.
Despite the misleading comment "SAFE: approver must differ from creator", this query doesn't prevent the creator from approving their own PO.
This is a BAD query that violates separation of duties principle.

# Code

```sql
-- SAFE: approver must differ from creator
UPDATE purchase_orders SET status='APPROVED', approved_by=:user_id
WHERE id=:po_id AND buyer_org_id=:org_id AND status='PENDING_APPROVAL';
```

# Expected

bad