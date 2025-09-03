# Description
❌4 Bad test case with OR precedence leak affecting aggregation. This logic error bypasses supplier membership checks due to incorrect operator precedence, including unauthorized PO counts in the aggregation.

# Code
```sql
-- SAFE: status counts for supplier only
SELECT status, COUNT(*) FROM purchase_orders
WHERE is_deleted=false AND EXISTS(SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id) OR buyer_org_id=:org_id
GROUP BY status;
```

# Expected
bad