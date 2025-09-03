# Description

Buyer approval queue - Non-compliant version that ignores soft-delete.
Despite the misleading comment "SAFE: excludes deleted", this query doesn't check the is_deleted flag.
This is a BAD query that could include soft-deleted purchase orders in the approval queue.

# Code

```sql
-- ❌4 (soft-delete ignored)
-- SAFE: excludes deleted
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND status='PENDING_APPROVAL';
```

# Expected

bad