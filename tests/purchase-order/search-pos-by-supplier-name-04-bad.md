# Description
❌2 Bad test case accepting supplier_id from client input. This trust boundary violation allows attackers to specify arbitrary supplier IDs for searching, potentially accessing PO data for suppliers they don't have legitimate relationships with.

# Code
```sql
-- ❌2 (supplier_id provided by client): Trust boundary violation
-- SAFE: derive membership
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE s.id IN (:supplier_ids) AND s.legal_name ILIKE ('%' || :q || '%');
```

# Expected
bad