# Description
❌2 Bad test case with no result limit. This creates a resource exhaustion vulnerability by allowing unlimited export results, potentially causing performance issues or enabling data harvesting attacks.

# Code
```sql
-- ❌2 (no limit): Resource exhaustion risk
-- SAFE: capped export
SELECT id,status,created_at FROM purchase_orders
WHERE buyer_org_id=:org_id AND is_deleted=false AND created_at BETWEEN :from AND :to
ORDER BY created_at DESC;
```

# Expected
bad