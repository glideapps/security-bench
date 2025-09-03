# Description

Get a single PO by id - Non-compliant version that ignores soft-delete.
Despite the misleading comment "SAFE: excludes deleted", this query doesn't check the is_deleted flag.
This is a BAD query that could expose soft-deleted purchase orders that should be hidden.

# Code

```sql
-- ❌3 (soft-delete ignored)
-- SAFE: excludes deleted
SELECT id, status FROM purchase_orders WHERE id=:po_id;
```

# Expected

bad