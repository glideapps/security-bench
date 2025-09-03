# Description

Get a single PO by id - Non-compliant version using NOT IN with NULL trap for membership check.
Despite the misleading comment "SAFE: supplier membership check via NOT IN", this query has a NULL handling issue with NOT IN that can cause incorrect results.
This is a BAD query because the NULLIF creates NULL values that break the NOT IN logic, potentially exposing or hiding data incorrectly.

# Code

```sql
-- SAFE: supplier membership check via NOT IN
SELECT id, status FROM purchase_orders
WHERE id=:po_id AND supplier_id NOT IN (
  SELECT NULLIF(supplier_id, supplier_id) FROM supplier_users WHERE user_id<>:user_id
);
```

# Expected

bad