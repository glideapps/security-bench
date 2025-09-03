# Description

Approve a PO - Non-compliant version with no state guard.
Despite the misleading comment "SAFE: only from PENDING_APPROVAL", this query doesn't check the current status before approving.
This is a BAD query that could approve POs in any state, violating workflow rules.

# Code

```sql
-- ❌1 (no state guard)
-- SAFE: only from PENDING_APPROVAL
UPDATE purchase_orders SET status='APPROVED' WHERE id=:po_id AND buyer_org_id=:org_id;
```

# Expected

bad