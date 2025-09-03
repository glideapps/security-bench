# Description
❌3 Bad test case that ignores soft-delete flags. This violates data integrity by including deleted POs and suppliers in search results, potentially exposing archived business relationships that should remain hidden.

# Code
```sql
-- ❌3 (soft-delete ignored): Includes deleted POs and suppliers in search
-- SAFE: excludes deleted
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND s.legal_name ILIKE ('%' || :q || '%');
```

# Expected
bad