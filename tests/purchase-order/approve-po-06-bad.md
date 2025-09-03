# Description

Approve a PO - Non-compliant version that ignores soft-delete.
Despite the misleading comment "SAFE: excludes deleted", this query doesn't check the is_deleted flag.
This is a BAD query that could approve soft-deleted purchase orders.

# Code

```sql
-- ❌4 (soft-delete ignored)
-- SAFE: excludes deleted
UPDATE purchase_orders SET status='APPROVED' WHERE id=:po_id AND buyer_org_id=:org_id AND status='PENDING_APPROVAL';
```

# Expected

bad