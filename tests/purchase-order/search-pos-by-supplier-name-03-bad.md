# Description
❌1 Bad test case with no access scope validation for global name search. This vulnerability allows any authenticated user to search across all organizations' POs by supplier name, exposing sensitive business relationships globally.

# Code
```sql
-- SAFE: tenant/membership enforced
SELECT po.id, s.legal_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
WHERE s.legal_name ILIKE ('%' || :q || '%');
```

# Expected
bad