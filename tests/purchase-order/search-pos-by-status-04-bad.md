# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: membership derived server-side". However, it has no tenant filtering at all, allowing users to search purchase orders across all organizations.

# Code
```sql
-- SAFE: membership derived server-side
SELECT id, status FROM purchase_orders
WHERE status=ANY(:statuses);
```

# Expected
bad