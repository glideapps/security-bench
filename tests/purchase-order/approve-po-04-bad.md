# Description

Approve a PO - Non-compliant version that allows supplier to approve.
Despite the misleading comment "SAFE: buyer_admin only", this query has no role check, allowing any user including suppliers to approve.
This is a BAD query that fails to implement role-based access control for approvals.

# Code

```sql
-- SAFE: buyer_admin only
UPDATE purchase_orders SET status='APPROVED', approved_by=:user_id
WHERE id=:po_id;
```

# Expected

bad