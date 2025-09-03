# Description
❌2 Bad test case using LEFT JOIN that creates data integrity issues. This pattern includes POs even when supplier validation fails, potentially exposing POs without valid supplier relationships through the LEFT JOIN.

# Code
```sql
-- ❌2 (LEFT JOIN + WHERE on supplier optional): Inconsistent supplier filtering
-- SAFE: inner semantics enforced
SELECT po.id FROM purchase_orders po
LEFT JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false;
```

# Expected
bad