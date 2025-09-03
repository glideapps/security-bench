# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: membership derived server-side". However, it accepts supplier_ids directly from user input (:supplier_ids parameter), allowing attackers to specify arbitrary supplier IDs they don't have access to.

# Code
```sql
-- ❌2 (IN with user-supplied supplier_id)
-- SAFE: membership derived server-side
SELECT id, status FROM purchase_orders
WHERE supplier_id IN (:supplier_ids) AND status=ANY(:statuses);
```

# Expected
bad