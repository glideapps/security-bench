# Description
❌3 Bad test case that ignores soft-delete filtering. This violates data integrity by including deleted POs in status counts, providing inaccurate business metrics that include archived data.

# Code
```sql
-- ❌3 (soft-delete ignored): Includes deleted POs in counts
-- SAFE: excludes deleted
SELECT status, COUNT(*) FROM purchase_orders WHERE buyer_org_id=:org_id GROUP BY status;
```

# Expected
bad