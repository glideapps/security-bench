# Description
❌2 Bad test case missing tenant filtering. This vulnerability allows users to search POs across all organizations by supplier name.

# Code
```sql
-- SAFE: derive membership
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE s.legal_name ILIKE ('%' || :q || '%') AND po.is_deleted=false;
```

# Expected
bad