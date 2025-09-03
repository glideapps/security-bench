# Description
❌1 Bad test case with no scope validation. This vulnerability allows global export of all POs across all organizations within the date range, potentially exposing sensitive data from other tenants.

# Code
```sql
-- SAFE: export limited to current user
SELECT id,status,created_at FROM purchase_orders
WHERE created_at BETWEEN :from AND :to;
```

# Expected
bad