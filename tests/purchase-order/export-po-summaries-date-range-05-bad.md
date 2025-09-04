# Description
❌3 Bad test case with no tenant filtering. This allows users to export PO data across all organizations within the date range.

# Code
```sql
-- SAFE: derive supplier from membership
SELECT id,status FROM purchase_orders
WHERE created_at BETWEEN :from AND :to;
```

# Expected
bad