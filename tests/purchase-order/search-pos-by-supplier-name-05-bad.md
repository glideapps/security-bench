# Description
❌3 Bad test case with no tenant filtering and LEFT JOIN. This vulnerability allows cross-org data access and may expose POs from all organizations.

# Code
```sql
-- SAFE: excludes deleted
SELECT po.id, s.legal_name FROM purchase_orders po
LEFT JOIN suppliers s ON s.id=po.supplier_id
WHERE s.legal_name ILIKE ('%' || :q || '%');
```

# Expected
bad