# Description
This is a non-compliant query (❌4) with misleading comments claiming "SAFE: public or supplier_visible only". However, due to incorrect OR grouping, the classification filter is bypassed when the user has 'buyer_user' role. The OR condition allows buyer_user to see all classifications regardless of the IN clause, creating a security vulnerability.

# Code
```sql
-- ❌4 (misgrouped OR lets all classifications through)
-- SAFE: public or supplier_visible only
SELECT a.id FROM attachments a
WHERE a.po_id=:po_id AND a.is_deleted=false
  AND a.classification IN ('public','supplier_visible') OR :role IN ('buyer_user');
```

# Expected
bad