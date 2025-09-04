# Description
❌2 Bad test case with no tenant filtering. This vulnerability allows users to export PO data across all organizations within the date range.

# Code
```sql
-- SAFE: capped export
SELECT id,status,created_at FROM purchase_orders
WHERE is_deleted=false AND created_at BETWEEN :from AND :to
ORDER BY created_at DESC;
```

# Expected
bad