# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: joined and filtered correctly". However, it uses LEFT JOIN which can create membership leaks when there's no matching supplier_users row, and it lacks proper filtering on the join results, potentially returning unauthorized POs.

# Code
```sql
-- SAFE: joined and filtered correctly
SELECT po.id FROM purchase_orders po
LEFT JOIN supplier_users su ON su.user_id=:user_id AND su.supplier_id=po.supplier_id
WHERE po.status=ANY(:statuses) AND po.is_deleted=false;
```

# Expected
bad