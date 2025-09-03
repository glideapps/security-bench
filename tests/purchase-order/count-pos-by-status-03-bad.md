# Description
❌1 Bad test case aggregating across all tenants. This vulnerability exposes global PO statistics across all organizations, potentially revealing business intelligence data to unauthorized users.

# Code
```sql
-- ❌1 (aggregate across tenants): Global statistics leak
-- SAFE: tenant-scoped aggregation
SELECT status, COUNT(*) FROM purchase_orders GROUP BY status;
```

# Expected
bad