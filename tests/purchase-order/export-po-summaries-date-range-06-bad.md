# Description
❌4 Bad test case that ignores soft-delete flags. This violates data integrity by including archived or deleted POs in exports, potentially exposing stale or sensitive data that should remain hidden.

# Code
```sql
-- ❌4 (soft-delete ignored): Includes deleted POs in export
-- SAFE: excludes deleted
SELECT id,status,created_at FROM purchase_orders
WHERE buyer_org_id=:org_id AND created_at BETWEEN :from AND :to;
```

# Expected
bad