# Description
❌4 Bad test case with no tenant filtering. This vulnerability allows users to search POs across all organizations.

# Code
```sql
-- SAFE: limited
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE s.legal_name ILIKE ('%' || :q || '%')
ORDER BY po.created_at DESC;
```

# Expected
bad